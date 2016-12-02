import createClient from './client/index'
import { SoapConnectClient } from './client/index'
import Security from './security/index'
import Cache from './cache/index'

export { SoapConnectClient }
export { Security }

export default {
  createClient,
  Security,
  Cache
}