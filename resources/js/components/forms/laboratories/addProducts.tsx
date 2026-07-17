import { usePage } from '@inertiajs/react';
import { useState } from 'react';
import routes from '@/constants/routes';
import Http from '@/utils/Http';
import Notiflix from 'notiflix';
import { Button } from '@/components/ui/button';
import { Barcode } from 'lucide-react';

export default function AddLabProduct() {
    const { props } = usePage();
    const [productName, setProductName] = useState('');
    const [category, setCategory] = useState([]);
    const [quantity, setQuantity] = useState();
    const [expiry, setExpiry] = useState('');
    const [unit, setUnit] = useState('');
    const [description, setDescription] = useState('');
    const [batchNumber, setBatchNumber] = useState('');
    const [barcode, setBarcode] = useState('');
    const [transaction, setTransaction] = useState('');
    const [loading, setLoading] = useState(false)
        const productDetails = {
        product_name: productName,
        category_id: category,
        quantity: quantity,
        expiry_date: expiry,
        unit: unit,
        description: description,
        batchNumber: batchNumber,
        product_code: barcode,
        created_by: props.auth.user.id,
        created_by_department:4
    }; 

    const reset   = () => {
        setProductName('');
        setBarcode('');
        setCategory('');
        setDescription('');
        setQuantity('');
        setBatchNumber('');
        setUnit('');
        setExpiry('')
    }

    const createProductHandler = async () => {
        setLoading(true)
        try {
            const product = await Http.post(routes.api.laboratory.add, {
                productDetails,
            });
            Notiflix.Notify.success(product.data.message);
            reset();
            setLoading(false)
        } catch (error) {
            setLoading(false)
            Notiflix.Notify.failure(error.message);
        }
    };

    const handleProductName = (e) => {
        setProductName(e.target.value);
    };
    const handleCategory = (e) => {
        setCategory(e.target.value);
    };
    const handleQuantity = (e) => {
        setQuantity(e.target.value);
    };
    const handleExpiryDate = (e) => {
        setExpiry(e.target.value);
    };
    const handleUnit = (e) => {
        setUnit(e.target.value);
    };
    const handleDescription = (e) => {
        setDescription(e.target.value);
    };
    const handleBatchNumber = (e) => {
        setBatchNumber(e.target.value);
    };
    const handleBarcode = (e) => {
        setBarcode(e.target.value);
    };
    const handleTransaction = (e) => {
        setTransaction(e.target.value);
    };

    return (
        <>
            <div className="">
                <h1 className='p-2'>Add Product</h1>
                <div className="border-t">
                    <div className='flex gap-2 mt-4'>
                        <Barcode /> 
                        <p className="text-gray-400 font-light font-serifs ">Use barcode scanner to read the barcode</p>
                    </div>
                     <div className="mt-4">
                            <input
                                type="text"
                                className="h-10 rounded-lg bg-gray-100 px-2"
                                placeholder="barcode" 
                                value={productDetails.product_code}
                                onChange={(e)=>{handleBarcode(e)}}
                            />
                        </div>
                    <div className="flex gap-10">
                        <div className="mt-10">
                            <input
                                type="text"
                                className="h-10 rounded-lg bg-gray-100 px-2"
                                placeholder="Product name"
                                onChange={(e)=>{handleProductName(e)}}
                                value={productDetails.product_name}
                            />
                        </div>
                        <div className="mt-10">
                            <select className="h-10 rounded-lg bg-gray-100 px-2" onChange={(e)=>{handleCategory(e)}}>
                                <optgroup label="Laboratory Supplies Category">
                                    <option value={0}>Select</option>
                                    <option value={1}>Reagents</option>
                                    <option value={2}>Cleaning Agents</option>
                                    <option value={3}>Protective Gear</option>
                                    <option value={4}>Glassware</option>
                                </optgroup>
                                <optgroup label="Chemical Substances">
                                    <option value={5}>Acids</option>
                                    <option value={6}>Bases</option>
                                    <option value={7}>Organic Compounds</option>
                                </optgroup>
                            </select>
                        </div>
                        <div className="mt-10">
                            <input
                                type="text"
                                className="h-10 rounded-lg bg-gray-100 px-2"
                                placeholder="Unit e.g 100"
                                onChange={(e)=>{handleUnit(e)}}
                                value={productDetails.unit}
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="w-1/2">
                            <div className="flex gap-2 mt-10">
                                <input
                                    type="date"
                                    className="h-10 rounded-lg bg-gray-100 px-2"
                                    onChange={(e)=>{handleExpiryDate(e)}}
                                    value={productDetails.expiry_date}
                                />
                                  <input
                                    type="text"
                                    className="h-10 rounded-lg bg-gray-100 px-2"
                                    placeholder="quantity"
                                    onChange={(e)=>{handleQuantity(e)}} 
                                    value={productDetails.quantity}
                                />
                            </div>
                        </div>
                        <div className="w-1/2">
                            <div className="mt-10">
                                <textarea
                                    placeholder="Description"
                                    className="w-full rounded-lg bg-gray-100 p-2"
                                    onChange={(e)=>{handleDescription(e)}}
                                    value={productDetails.description}
                                ></textarea>
                            </div>
                        </div>
                    </div>
                    <div className=''>
                        <Button onClick={createProductHandler} disabled={loading}>
                            {loading?"Saving..":"Submit"}
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
