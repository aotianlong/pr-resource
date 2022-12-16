import _ from 'lodash';

class ActiveStorageURL extends String {
  static from(url: string | string[]) {
    if (_.isArray(url)) {
      return url.map((i) => new ActiveStorageURL(i));
    }
    return new ActiveStorageURL(url);
  }

  get thumb() {
    return `${this.replace('?', '')}-thumb`;
  }

  get tiny() {
    return `${this.replace('?', '')}-tiny`;
  }

  get normal() {
    return `${this.replace('?', '')}-normal`;
  }

  get original() {
    return this;
  }
}

export type { ActiveStorageURL };
export default ActiveStorageURL;
