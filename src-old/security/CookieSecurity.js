import _ from 'lodash'
import Security from './Security'

export class CookieSecurity extends Security {
  constructor (cookie, options) {
    super(options)

    cookie = _.get(cookie, 'set-cookie', cookie)
    let cookies = _.map(_.isArray(cookie) ? cookie : [cookie], (c) => {
      return c.split(';')[0]
    })

    this.cookie = cookies.join('; ')
  }

  addHttpHeaders (headers) {
    headers.Cookie = this.cookie
  }
}

export default function (cookie, options) {
  return new CookieSecurity(cookie, options)
}