import Security from './Security'

export class CookieSecurity extends Security {
  constructor (cookie, options) {
    super(options)
    this.cookie = cookie
  }

  addHttpHeaders (headers) {
    headers.Cookie = this.cookie
  }
}

export default function (cookie, options) {
  return new CookieSecurity(cookie, options)
}