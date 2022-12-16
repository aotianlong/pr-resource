/* eslint-disable @typescript-eslint/ban-types */
import _ from 'lodash';
import inflection from 'inflection';
import config from '../config';
import Resource, { mountedCallbacks } from './index';
import {
  CreateResourceClass,
  ResourceClass,
  ResourceDefinition,
} from '../../types';

const resources: Record<string, ResourceClass> = {};

const { apollo } = config;

function defineResource<
  TClassMethods extends {} = {},
  TClassAttributes extends {} = {},
  TInstanceMethods extends {} = {},
  TInstanceAttributes extends {} = {},
  TComputed extends {} = {}
>(
  options: ResourceDefinition<
    TClassMethods,
    TClassAttributes,
    TInstanceMethods,
    TInstanceAttributes,
    TComputed
  >
): CreateResourceClass<TClassMethods, TClassAttributes> & ResourceClass {
  const Klass = function (...args: any[]) {
    return new Resource(...args);
  };

  // 静态属性
  _.each(Object.keys(Resource), (k) => {
    Klass[k] = Resource[k];
  });
  // prototype
  Object.assign(Klass.prototype, Object.create(Resource.prototype));

  // 设置名称
  if (!options.name) throw new Error('name can not be empty');

  const objectName =
    options.objectName ||
    inflection.camelize(_.last(options.name.split('::')) as string, true);
  const objectsName =
    options.objectsName ||
    inflection.camelize(inflection.pluralize(objectName), true);
  const className = options.name.replace('::', '');
  const classesName = inflection.pluralize(className);
  const fieldName = options.fieldName || objectName;

  Object.assign(
    Klass,
    {
      $apollo: apollo,
      options,
      className,
      classesName,
      objectName,
      objectsName,
      fieldName,
    },
    options.classMethods || {},
    options.classAttributes || {},
    {
      toString: function toString() {
        return `<Resource:${options.name}>`;
      },
      _isResourceConstructor: true,
      $resources: resources,
    }
  );

  const instanceMethods = { ...(options.methods || {}) };

  Object.assign(Klass.prototype, instanceMethods, options.attributes || {}, {
    klass: Klass,
    // 描述此class的字符串
    toString: function toString(this: ResourceType): string {
      // const attributes = JSON.stringify(this.attributes);
      return `<Resource:${options.name} id=${this.id}>`;
    },
  });

  /*
  _.each(mountedCallbacks, (mountedCallback) => {
    mountedCallback.bind(klass)(klass);
  });
  */

  Object.defineProperty(Klass, 'name', { value: options.name });

  Klass.attributeNames = _.keys(options.attributes || {});
  Klass.methodNames = _.keys(options.methods || {});

  _.each(mountedCallbacks, (callback) => {
    callback.bind(Klass)(Klass);
  });

  Klass.options = options;

  resources[options.name] = Klass;
  return Klass;
}

export { resources };
export default defineResource;
