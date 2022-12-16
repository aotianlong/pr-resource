import { Base64 } from 'js-base64';
import { resourceClasses } from './resource-classes';

export function create(id: string, type: string | null = null) {
  return Base64.encode([type, id].join('/'));
}

export function parse(nodeId: string) {
  try {
    const r = Base64.decode(nodeId);
    const [type, id] = r.split('/');
    if (type && id) {
      return {
        type,
        id,
        resourceClass: resourceClasses[type],
      };
    }
    return null;
  } catch {
    return null;
  }
}
