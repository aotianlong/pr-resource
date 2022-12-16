/* eslint-disable @typescript-eslint/ban-types */
/*
  const User = createResource({
    name: 'User',
    computed: {
      fullName () {
        return [this.attributes.firstName, this.attributes.lastName].join(" ")
      }
    }
  })

  let user = new User({name: 'aotianlong', email: 'aotianlong@gmail.com'})
  user.save()
  user.name // 'aotianlong'
  user.email // 'aotianlong@gmail.com'
  user.destroy() // 删除此user
*/
import _ from 'lodash';
import inflection from 'inflection';
import { reactive } from 'vue';
import {
  AnyObject,
  ResourceDefinition,
  Resource as ResourceType,
  ModuleDefinition,
  Resources,
  ResourceClass,
  CreateResourceClass,
  CreateResource,
  GetFunction,
  SetFunction,
} from './types';
import baseModule from './modules/base';
import attributesModule from './modules/attributes';
import gqlModule from './modules/gql';
import i18nModule from './modules/i18n';
import findModule from './modules/find';
import fieldsModule from './modules/fields';
import urlsModule from './modules/urls';
import validationModule from './modules/validation';
import modelModule from './modules/model';
import variableNamesModule from './modules/variable-names';
import logModule from './modules/log';
import fragmentsModule from './modules/fragments';
import hooksModule from './modules/hooks';
import formatModule from './modules/format';
import serializeModule from './modules/serialize';
import piniaModule from './modules/pinia';
import connectionModule from './modules/connection';
import batchModule from './modules/batch';
import graphModule from './modules/graph';
import introspectionModule from './modules/introspection';
import uiModule from './modules/ui';
import createProxyHandler from './lib/proxy-handler';
import resourceClasses, { addResourceClass } from './lib/resource-classes';
import config from './lib/config';

const modules = [
  i18nModule,
  variableNamesModule,
  baseModule,
  attributesModule,
  hooksModule,
  gqlModule,
  findModule,
  fieldsModule,
  urlsModule,
  validationModule,
  modelModule,
  logModule,
  fragmentsModule,
  formatModule,
  serializeModule,
  piniaModule,
  connectionModule,
  batchModule,
  graphModule,
  introspectionModule,
  uiModule,
];

function createResource<T extends ResourceDefinition>(
  options: T
): CreateResourceClass<T> & ResourceClass {
  const classMethods = {
    from(
      this: ResourceClass,
      attrs: AnyObject | AnyObject[] = []
    ): ResourceType | ResourceType[] {
      const Klass = this;
      if (!_.isArray(attrs)) {
        return new Klass(attrs);
      }
      return attrs.map((attr) => new Klass(attr));
    },
  };
  const classAttributes = { ...createResource.classAttributes };
  const methods = { ...createResource.methods };
  const initializers: (() => void)[] = [];
  const instanceAttributes = { ...createResource.attributes };
  const computedAttributes = {};
  const mountedCallbacks: ((klass: ResourceClass) => void)[] = [];
  const gets: ((target: any, key: string, receiver?: any) => any)[] = [];
  const sets: ((
    target: any,
    key: string,
    value: any,
    receiver?: any
  ) => boolean)[] = [];

  function addModule(module: ModuleDefinition) {
    Object.assign(classMethods, {}, module.classMethods || {});
    Object.assign(methods, {}, module.methods || {});
    Object.assign(instanceAttributes, {}, module.attributes || {});
    Object.assign(classAttributes, {}, module.classAttributes || {});
    Object.assign(computedAttributes, {}, module.computed || {});
    if (module.initialize) {
      initializers.push(module.initialize);
    }
    if (module.mounted) {
      mountedCallbacks.push(module.mounted);
    }
    if (module.get) {
      gets.push(module.get);
    }
    if (module.set) {
      sets.push(module.set);
    }
  }

  _.each(modules, (useModule) => {
    addModule(useModule());
  });

  // config里的modules也添加进来
  _.each(config.modules, (useModule) => {
    addModule((useModule as () => ModuleDefinition)());
  });

  // 将options作为最后一个module
  addModule(options);

  const Resource = function Resource(
    this: ResourceType,
    attributes: AnyObject | ResourceType = {},
    opts: AnyObject = {}
  ): CreateResource<T> & ResourceType {
    // 如果为空，则使用空对象
    if (!attributes) {
      attributes = {};
    }
    if (attributes._isResource) {
      this._attributes = attributes._attributes as AnyObject;
    } else {
      this._attributes = reactive(attributes);
      // this._attributes = attributes;
    }
    // 自动设置__typename
    if (!this._attributes.__typename) {
      this._attributes.__typename = this.klass.name;
    }

    const proxyHandler = createProxyHandler(gets, sets);
    const proxy = new Proxy(this, proxyHandler);

    // 设置属性
    // console.log('initializers', initializers)
    _.each(initializers, (initializer) => {
      initializer.bind(proxy)();
    });
    this.klass.runHooks('initialize', this);

    this.$proxy = proxy;
    return proxy;
  };

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

  const klass: ResourceClass = Object.assign(
    Resource,
    {
      options,
      className,
      classesName,
      objectName,
      objectsName,
      fieldName,
    },
    classMethods,
    classAttributes,
    {
      toString: function toString() {
        return `<Resource:${options.name}>`;
      },
      _isResourceConstructor: true,
      $resources: resourceClasses,
    }
  );

  klass.$schema = config.schema;
  klass.$i18n = config.i18n;
  klass.$apollo = config.apollo;

  // 处理计算属性
  _.each(computedAttributes, (v, k) => {
    if (_.isFunction(v)) {
      Object.defineProperty(klass.prototype, k, {
        get: v,
        enumerable: true,
        configurable: true,
      });
    } else if (_.isPlainObject(v)) {
      console.log('v', v);
      Object.defineProperty(klass.prototype, k, {
        get: v.get,
        set: v.set,
        enumerable: true,
        configurable: true,
      });
    }
  });

  klass.computedNames = Object.keys(computedAttributes);
  klass.computedAttributes = computedAttributes;

  const instanceMethods = { ...methods };

  Object.assign(klass.prototype, instanceMethods, instanceAttributes, {
    klass: Resource, // klass is deprecated, use Klass instead
    Klass: Resource,
    // 描述此class的字符串
    toString: function toString(this: ResourceType): string {
      // const attributes = JSON.stringify(this.attributes);
      return `<Resource:${options.name} id=${this.id}>`;
    },
  });

  _.each(mountedCallbacks, (mountedCallback) => {
    mountedCallback.bind(klass)(klass);
  });

  Object.defineProperty(klass, 'name', { value: options.name });

  klass.attributeNames = _.keys(instanceAttributes);
  klass.methodNames = _.keys(instanceMethods);

  addResourceClass(options.name, klass);
  // resourceClasses[options.name] = klass;

  return klass as CreateResourceClass<T>;
}

createResource.classAttributes = {};
createResource.methods = {};
createResource.attributes = {};
createResource.use = function use(object: { install: (obj: any) => void }) {
  object.install(createResource);
};

export default createResource;
