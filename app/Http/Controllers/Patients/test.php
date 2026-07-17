<?php

public function orderMCHService(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'patient_id' => 'required|exists:patients,id',
            'type' => 'required|in:antenatal,postnatal,child_health',
            'services' => 'required|array|min:1',
            'services.*.service_id' => 'required|exists:services,id',
            'services.*.service_name' => 'required|string',
            'services.*.service_category' => 'required|string',
            'services.*.price' => 'required|numeric|min:0',
            'services.*.quantity' => 'sometimes|integer|min:1',
            'services.*.priority' => 'sometimes|in:routine,urgent,stat',
            'services.*.notes' => 'nullable|string',
            'scheme' => 'sometimes|in:cash,nhima,insurance,charity,mobile_money'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 400,
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $patientId = $request->input('patient_id');
        $activeToken = VisitTokenHelper::getActiveTokenArray($patientId);
        $token = $activeToken['token'] ?? null;

        if (!$token) {
            return response()->json([
                'status'  => 400,
                'success' => false,
                'message' => 'Sorry, please start a visit to continue'
            ], 400);
        }

        // Get payment scheme from active token or request
        $paymentMethod = $request->input('scheme', $activeToken['payment_method'] ?? 'cash');

        // Handle mobile_money as cash
        if ($paymentMethod === 'mobile_money') {
            $paymentMethod = 'cash';
        }

        try {
            DB::beginTransaction();

            $patient = Patient::findOrFail($patientId);

            // Calculate total amount and prepare items
            $totalAmount = 0;
            $invoiceItems = [];
            $mchOrderItems = [];
            $serviceType = $request->input('type');

            foreach ($request->services as $service) {
                $serviceRecord = Service::find($service['service_id']);
                if (!$serviceRecord) {
                    throw new \Exception("Service not found: {$service['service_name']}");
                }

                // Get quantity (default to 1 if not specified)
                $quantity = $service['quantity'] ?? 1;
                $priority = $service['priority'] ?? 'routine';

                // Get price based on payment scheme
                $unitPrice = $this->getPriceByScheme($serviceRecord, $paymentMethod);

                // If service has custom price from frontend, use that instead
                if (isset($service['price']) && $service['price'] > 0) {
                    $unitPrice = $service['price'];
                }

                if (!$unitPrice || $unitPrice <= 0) {
                    throw new \Exception("Price not found for service: {$serviceRecord->service_name} with scheme: {$paymentMethod}");
                }

                $totalPrice = $unitPrice * $quantity;
                $totalAmount += $totalPrice;

                // Prepare invoice item - MATCHING LAB ORDER FORMAT
                $invoiceItems[] = [
                    'price' => $unitPrice,
                    'total' => $totalPrice,
                    'test_id' => $service['service_id'],  // Using test_id for consistency with lab orders
                    'priority' => $priority,
                    'quantity' => $quantity,
                    'service_id' => $service['service_id'],
                    'service_name' => $service['service_name'],
                    'service_category' => $service['service_category'],
                    'type' => $serviceType,
                    'created_at' => now()->toDateTimeString()
                ];

                // Prepare MCH order item
                $mchOrderItems[] = [
                    'service_id' => $service['service_id'],
                    'service_name' => $service['service_name'],
                    'service_category' => $service['service_category'],
                    'service_type' => $serviceType,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'total_price' => $totalPrice,
                    'priority' => $priority,
                    'notes' => $service['notes'] ?? null,
                    'collection_date' => $service['collection_date'] ?? null,
                    'ordered_at' => now(),
                    'visit_token' => $token
                ];
            }

            // Check for existing invoice with the same visit_token and is still draft/unpaid
            $existingInvoice = Invoice::where('visit_token', $token)
                ->whereIn('status', ['draft', 'unpaid'])
                ->where('patient_id', $patientId)
                ->first();

            $invoice = null;
            $isAppended = false;

            if ($existingInvoice) {
                // Append to existing invoice
                $existingItems = is_string($existingInvoice->items)
                    ? json_decode($existingInvoice->items, true)
                    : ($existingInvoice->items ?? []);

                // Merge existing items with new items
                $mergedItems = array_merge($existingItems, $invoiceItems);

                // Recalculate totals
                $newSubtotal = $existingInvoice->subtotal + $totalAmount;
                $newTotal = $existingInvoice->total + $totalAmount;
                $newDueAmount = $existingInvoice->due_amount + $totalAmount;

                // Update existing invoice
                $existingInvoice->update([
                    'items' => json_encode($mergedItems),
                    'subtotal' => $newSubtotal,
                    'total' => $newTotal,
                    'due_amount' => $newDueAmount,
                    'updated_at' => now(),
                ]);

                $invoice = $existingInvoice;
                $isAppended = true;

                Log::info('Appended MCH services to existing invoice', [
                    'invoice_id' => $invoice->id,
                    'visit_token' => $token,
                    'service_type' => $serviceType,
                    'services_count' => count($invoiceItems),
                    'total' => $totalAmount
                ]);
            } else {
                // Create new invoice
                $invoice = Invoice::create([
                    'invoice_number' => Invoice::generateInvoiceNumber(),
                    'patient_id' => $patient->id,
                    'user_id' => Auth::id(),
                    'visit_token' => $token,
                    'customer_name' => $patient->name,
                    'customer_email' => $patient->email ?? null,
                    'customer_phone' => $patient->phone ?? null,
                    'customer_address' => $patient->address ?? null,
                    'subtotal' => $totalAmount,
                    'tax' => 0,
                    'discount' => 0,
                    'total' => $totalAmount,
                    'paid_amount' => 0,
                    'due_amount' => $totalAmount,
                    'currency' => 'ZMW',
                    'payment_scheme' => $paymentMethod,
                    'items' => json_encode($invoiceItems),
                    'issue_date' => now(),
                    'due_date' => now()->addDays(30),
                    'status' => 'unpaid',
                    'invoice_type' => 'mch'
                ]);

                Log::info('Created new invoice for MCH services', [
                    'invoice_id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'visit_token' => $token,
                    'service_type' => $serviceType,
                    'services_count' => count($invoiceItems),
                    'total' => $totalAmount
                ]);
            }

            // Insert into mch_order_items table
            foreach ($mchOrderItems as $orderItem) {
                DB::table('mch_order_items')->insert([
                    'invoice_id' => $invoice->id,
                    'patient_id' => $patientId,
                    'ordered_by' => Auth::id(),
                    'order_number' => $this->generateMCHOrderNumber(),
                    'status' => 'pending',
                    'created_at' => now(),
                    'updated_at' => now(),
                    ...$orderItem
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => $isAppended
                    ? count($invoiceItems) . ' MCH service(s) ordered and added to existing invoice successfully'
                    : count($invoiceItems) . ' MCH service(s) ordered and new invoice created successfully',
                'data' => [
                    'invoice' => $invoice,
                    'order_items' => $mchOrderItems,
                    'is_appended' => $isAppended,
                    'total_amount' => $totalAmount,
                    'service_type' => $serviceType
                ]
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('MCH Order Error: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());

            return response()->json([
                'success' => false,
                'message' => 'Failed to order MCH service',
                'error' => $e->getMessage()
            ], 500);
        }
    }
