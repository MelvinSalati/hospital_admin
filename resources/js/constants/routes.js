const routes = {
    'api': {
        'bills':'/bills',
        'search':'patients/search',
        'departments':'departments/list',
        'drugs':'drugs/list',
        'labs':'labs/list',
        'services':'services/list',

        /**
         * API's routes for laboratory
         */

        'laboratory': {
            'add':'laboratory/product/create',
            'labs':'laboratory/products/list',
            'stock':'stock/status',
            'settings':'settings',
            'services':'lab/services',
        },
          /**
         * API's routes for laboratory
         */

        'pharmacy': {
            'add':'pharmacy/product/create',
            'drugs':'pharmacy/products/list',
            'stock':'pharmacy/stock/status'
        },
          'consultation': {
            'create':'consultation/create',
            'history':'counsultation/list'
        },
        'bulkstore': {
            'search' : 'bulkstore/product/search'
        },
        'user': {
            'register':'admin/user/create'
        },
        "nursingDiagnosis" : {
            'index': 'nursing/diagnosis/{patientId}',
            'create': 'nursing/diagnosis/{patientId}',
            'update': 'nursing/diagnosis/{patientId}/{id}',
            'delete': 'nursing/diagnosis/{patientId}/{id}',
            'evaluate': 'nursing/diagnosis/{patientId}/{id}/evaluate',
        }
    },
    web: {
        'user': {
            'account': 'users/manage-account'
        }
    }
}

export default routes;
