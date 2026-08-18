/**
 * Reusable HTTP request helper
 */
import Http from './Http';

async function route(method, url, data = null, config = {}) {
    const response = await Http({
        method,
        url,
        data,
        ...config,
    });

    return response.data;
}

export default route;