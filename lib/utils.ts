import _ from 'lodash';
import inflection from 'inflection';
import { logger } from '@rails/actioncable';
import { Base64 } from 'js-base64';
import { parse } from './node-id';
import { ConnectionClass, Resource, ResourceClass } from '../types';
import { resourceClasses } from './resource-classes';

export const base64json = {
  stringify(obj: any) {
    return Base64.encode(JSON.stringify(obj));
  },
  parse(str: string) {
    try {
      return JSON.parse(atob(str));
    } catch {
      return null;
    }
  },
};

function blobUrlToId(url: string | null | undefined) {
  if (!url) return null;
  const regexp = /\/b\/([\w-]+)$/;
  const match = url.match(regexp);
  if (match) {
    const id = match[1];
    // 去掉缩图信息
    const idWithoutType = id.replace(/-\w{1,10}$/, '');
    return idWithoutType;
  }
  return null;
}

function formatErrors(
  errors?: Record<string, string[] | string>
): Record<string, string> | null {
  if (errors && _.keys(errors).length > 0) {
    const result = _.mapValues(errors, (v) => _.flatten([v])[0]);
    return _.mapKeys(result, (v, k) => inflection.camelize(k, true));
  }
  return null;
}

/*
可以直接通过id来获取信息
*/
function idToResource(id: string, queryOptions = {}) {
  const parseResult = parse(id);
  if (parseResult) {
    const { type, id: resourceId } = parseResult;
    if (type && resourceId) {
      const resourceClass = resourceClasses[type];
      if (resourceClass) {
        return resourceClass.find(resourceId, queryOptions);
      }
    }
  }
  return Promise.resolve(null);
}

function isResource(resource: any) {
  return (
    _.isObject(resource) &&
    (resource as Resource)._isResource &&
    (resource as Resource).klass
  );
}

function isResourceClass(resource: any) {
  return (
    _.isObject(resource) && (resource as ResourceClass)._isResourceConstructor
  );
}

function toResource(
  object:
    | string
    | Resource
    | ResourceClass
    | undefined
    | null
    | Record<string, any>
): Resource | null {
  if (!object) {
    return null;
  }
  const resourceClass = toResourceClass(object);
  if (isResource(object)) {
    return object as Resource;
  }
  if (_.isPlainObject(object)) {
    const obj = object as Record<string, any>;
    const typename = obj.__typename;
    const RClass = toResourceClass(typename);
    if (RClass) {
      return new RClass(obj);
    }
  }
  if (resourceClass) {
    return new resourceClass(); // eslint-disable-line
  }
  return null;
}

function toResourceClass(
  resource:
    | string
    | Resource
    | ResourceClass
    | ConnectionClass
    | undefined
    | null,
  callback?: (resourceClass: ResourceClass) => any
): ResourceClass | null {
  const resourceClass = getResourceClass(resource);
  if (!resourceClass) {
    if (callback) {
      console.error(`unknow resource class: ${resource}`);
    }
  } else {
    if (callback) {
      callback(resourceClass);
    }
    return resourceClass;
  }
  return null;
}

function getResourceClass(
  resource:
    | string
    | Resource
    | ResourceClass
    | ConnectionClass
    | undefined
    | null
): ResourceClass | null {
  if (!resource) {
    return null;
  }
  if (typeof resource === 'string') {
    const resourceClass = resourceClasses[inflection.classify(resource)];
    if (resourceClass) {
      return resourceClass;
    }
  } else if ((resource as ResourceClass)._isResourceConstructor) {
    return resource as ResourceClass;
  } else if ((resource as Resource)._isResource) {
    return (resource as Resource).klass;
  } else if ((resource as ConnectionClass)._isConnection) {
    return resource.resourceClass;
  }
  return null;
}

function imageVariant(url: string, type?: string) {
  if (type) {
    return [url, type].join('-').replace('?', '');
  }
  return url;
}

/**
 * 判断except里的选项
 * 允许支持regexp
 */
const matchRule = (rule: (string | RegExp)[], column: string) => {
  if (!_.isEqual(rule, [])) {
    let found = false;
    _.each(rule, (except) => {
      if (_.isString(except)) {
        if (column === except) {
          found = true;
        }
      }
      if (_.isRegExp(except)) {
        found = !!column.match(except);
      }
    });
    return found;
  }
  return false;
};

function ensureResource(
  idOrResource: Resource | string
): Promise<null | Resource> {
  if (isResource(idOrResource)) {
    return Promise.resolve(idOrResource as Resource);
  }
  return idToResource(idOrResource as string) as Promise<null | Resource>;
}

export {
  imageVariant,
  idToResource,
  isResource,
  isResourceClass,
  toResource,
  toResourceClass,
  matchRule,
  formatErrors,
  blobUrlToId,
};
