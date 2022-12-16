/* eslint-disable max-classes-per-file */
import ApolloClient, { ApolloQueryResult, FetchPolicy } from 'apollo-client';
import {
  DefineStoreOptions,
  DefineStoreOptionsBase,
  StateTree,
  Store,
  StoreDefinition,
  _ActionsTree,
  _GettersTree,
} from 'pinia';
import { DocumentNode } from 'graphql';
import { I18n } from 'vue-i18n';
import type { Schema as SchemaClass } from './lib/schema';
import type { ActiveStorageURL } from './lib/active-storage-url';
import type { Connection as ConnectionClass } from './lib/connection';

export type Column = string | Record<string, string | Column[]>;

export type AnyObject = Record<string, unknown>;

export interface ResourceConfig {
  i18n: Record<string, any>;
  maxDepth: number;
  apollo: any;
  schema: any;
  modules: ModuleDefinition[];
}

/** Information about pagination in a connection. */
export type PageInfo = {
  __typename?: 'PageInfo';
  /** When paginating forwards, the cursor to continue. */
  endCursor?: string;
  /** When paginating forwards, are there more items? */
  hasNextPage: boolean;
  /** When paginating backwards, are there more items? */
  hasPreviousPage: boolean;
  /** When paginating backwards, the cursor to continue. */
  startCursor?: string;
};

export interface UrlOptions {
  module?: string;
  parent?: Resource | string;
}

/* open graph */
type BaseGraphFieldNames =
  | 'title'
  | 'type'
  | 'url'
  | 'description'
  | 'siteName'
  | 'video'
  | 'audio';

export type GraphFieldNames = BaseGraphFieldNames | 'image';
export type GraphResolver = ((resource: Resource) => string) | string;

export type GraphResolvers = {
  [key in BaseGraphFieldNames]: GraphResolver;
} & {
  image: (resource: Resource) => ActiveStorageURL | '';
};

export type PartialGraphResolvers = Partial<GraphResolvers>;
/* end open graph */

type AnyFunctions = {
  [key: string]: (...args: any[]) => any;
};

export interface FormStatus {
  [key: string]: { status: string; message: string };
}

// copy from /@vue/runtime-core/dist/runtime-core.d.ts
type ExtractComputedReturns<T> = {
  [key in keyof T]: T[key] extends {
    get: (...args: any[]) => infer TReturn;
  }
    ? TReturn
    : T[key] extends (...args: any[]) => infer TReturn
    ? TReturn
    : never;
};

type ExtractActions<T> = {
  [key in keyof T]: T[key] extends (...args: any[]) => infer TReturn
    ? (...args: any[]) => TReturn
    : any;
};

type ExtractAttributes<T> = {
  [key in keyof T]: T[key];
};

export type CreateResourceClass<T extends ResourceDefinition> = ExtractActions<
  T['classMethods']
> &
  ExtractAttributes<T['classAttributes']> &
  ResourceClass<CreateResource<T>>;

export type CreateResource<T extends ResourceDefinition> = ExtractActions<
  T['methods']
> &
  ExtractAttributes<T['attributes']> &
  ExtractComputedReturns<T['computed']> & {
    klass: CreateResourceClass<T>;
  } & Resource;

export type ID = string;
// pinia
export type DefaultStoreState = {
  connection: Connection;
  class: ResourceClass;
  object: null | Resource;
  objects: Resource[];
  newObject: AnyObject;
  objectLoading: boolean;
  objectsLoading: boolean;
  submitting: boolean;
  deleting: boolean;
  creating: boolean;
  updating: boolean;
  editing: boolean;
  page: number;
};

export interface BuildGqlOptions {
  queryName?: string;
  name?: string;
  columns?: Column | Column[];
  fragments?: string | string[];
  variables?: AnyObject;
  alias?: string;
  hasNodes?: boolean;
  gql?: boolean;
}

export type VerificationCode = {
  message: string;
  code: string;
  purpose: string;
};

// 定义一些graphql相关的泛型

export type Edge<T> = {
  __typename?: string;
  /** A cursor for use in pagination. */
  cursor: string;
  /** The item at the end of the edge. */
  node?: T;
};
export interface Connection<T = unknown> {
  __typename?: string;
  nodes?: T[];
  edges?: Edge<T>[];
  pageInfo?: PageInfo;
}

export interface AttributesHook {
  set: SetFunction;
  get: GetFunction;
  has(target: any, key: string): any;
  getOwnPropertyDescriptor(target: any, k: string): any;
  ownKeys(target: any): string[];
}

export interface SetFunction {
  (target: any, key: string, value: any, receiver?: any): boolean;
}

export interface GetFunction {
  (target: any, key: string, receiver?: any): any | never;
}

export interface SaveOption {
  validate?: boolean;
  columns?: string;
  extraColumns?: string;
  combinedVariables?: object;
  variableNames?: object;
  variables?: object;
  raw?: boolean;
  fragments?: string | string[];
}

export interface AssociationsOptions {
  hasOne: ProcessedAssociationOption[];
  hasMany: ProcessedAssociationOption[];
  belongsTo: ProcessedAssociationOption[];
}

export type RawAssociationOption =
  | AssociationOption
  | AssociationOption[]
  | (AssociationOption | string)[]
  | string[]
  | string;

export interface HookFunction {
  (...args: any[]): any | void;
}

export interface Resources {
  [key: string]: ResourceClass;
}

export interface AssociationOption {
  name: string;
  fields?: boolean | string;
  resource?: string | object;
}

export interface ProcessedAssociationOption {
  name: string;
  fields: string;
  getResource: () => ResourceClass | never;
}

export interface ModuleDefinition {
  get?: GetFunction;
  set?: SetFunction;
  parentId: (object: any) => string;
  classMethods?: Record<string, (...args: any[]) => any> &
    ThisType<CreateResourceClass<ResourceDefinition>>;
  methods?: ThisType<CreateResource<ResourceDefinition> & Resource> &
    Record<string, (...args: any[]) => any>;
  classAttributes?: AnyObject;
  computed?: Record<
    string,
    { get?: () => any; set?: (v: any) => any } | ((...args: any[]) => any)
  > &
    ThisType<CreateResource<ResourceDefinition>>;
  initialize?: (this: CreateResource<ResourceDefinition>) => void;
  attributes?: Record<string, any>;
  mounted?(
    this: CreateResourceClass<ResourceDefinition>,
    klass: ResourceClass
  ): void;
}

export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'attachable'
  | 'image'
  | 'tag'
  | 'category'
  | 'location'
  | 'images';

export interface UIOptions {
  component: {
    // component 的名字
    name: string;
  };
  show: {
    // 是否显示面包屑
    breadcrumbs?: boolean;
    recommends?: boolean;
    commentable?: boolean;
    favoritable?: boolean;
    visitable?: boolean;
    sharable?: boolean;
    recommendable?: boolean;
  };
  index: {
    searchable?: boolean;
    // 是否显示 面包屑
    breadcrumbs?: boolean;
    // 是否在modal中打开新建，跟修改
    modal?: boolean;
    type?: string; // table , card, etc.
  };
  form: {
    default: string;
  };
  edit: {
    // 是否显示面包屑
    breadcrumbs: boolean;
  };
  new: {
    // 是否显示面包屑
    breadcrumbs: boolean;
  };
}

type ResourceDefinitionFields = (string | AnyObject)[];

export interface ResourceDefinition<
  T extends { name: string; humanName: string } = {
    name: string;
    humanName: string;
  }
> {
  ui?: UIOptions;
  fieldTypes?: Record<string, FieldType>;
  // 有时候名字跟html的内建标签冲突了，那么就需要重新取一个名字。
  get?: GetFunction;
  set?: SetFunction;
  classMethods?: Record<
    string,
    (this: CreateResourceClass<T>, ...args: any[]) => any
  >;
  methods?: Record<string, (this: CreateResource<T>, ...args: any[]) => any>;
  classAttributes?: AnyObject;
  computed?: Record<string, (this: CreateResource<T>, ...args: any[]) => any>;
  initialize?: (this: CreateResource<T>) => void;
  attributes?: Record<string, any>;
  mounted?(this: CreateResourceClass<T>, klass: ResourceClass): void;
  graphResolvers?: PartialGraphResolvers;
  serialize?: string[];
  fragments?: Record<string, Fragment>;
  validationRules?: AnyObject;
  variableNames?: AnyObject;
  i18n?: AnyObject;
  columns?: Column | Column[];
  fields?:
    | ResourceDefinitionFields
    | ((arg: ResourceDefinitionFields) => ResourceDefinitionFields);
  name: string;
  objectName?: string;
  objectsName?: string;
  humanName?: string;
  fieldName?: string;
  hasMany?: RawAssociationOption;
  hasOne?: RawAssociationOption;
  belongsTo?: RawAssociationOption;
  validate?(this: CreateResource<T>): void;
  // 定义一个store
  store?(
    klass: CreateResourceClass<T>
  ): DefineStoreOptions<
    string,
    StateTree,
    _GettersTree<StateTree>,
    _ActionsTree
  >;
}

export interface QueryOptions {
  columns?: Column | Column[];
  variables?: AnyObject;
  fetchPolicy?: FetchPolicy;
  maxDepth?: number;
  nodes?: boolean;
  edges?: boolean;
  /*
   * 单个的时候有效
   */
  fragmentName?: string;
}

export type FindOptions = QueryOptions;
export interface ConnectionQueryOptions extends QueryOptions {
  connectionName?: string;
  connectionClass?: ResourceClass | string;
}
export interface ResourceClass<TInstace extends Resource = Resource> {
  // static
  $apollo: ApolloClient<AnyObject>;
  $i18n: I18n;
  $schema: SchemaClass;
  columnNames: string[];
  getInputFields(): Promise<any[]>;
  getFields(): Promise<any[]>;
  toRoute: () => any;
  toRoutes: () => any[];
  classesName: string;
  t: (key: string, ...args: any[]) => string;
  humanName: string;
  attrName: (field: string) => string;
  validationSchema: any;
  _connection?: Connection; // 缓存的connection
  attributesToResource: (
    attrs: AnyObject | AnyObject[]
  ) => Resource | Resource[] | any;
  defaultFragments: AnyObject;
  methodNames: string[];
  attributeNames: string[];
  fieldName: string;
  objectName: string;
  objectsName: string;
  className: string;
  columns: string;
  fields: (AnyObject | string)[];
  $resources: Resources;
  i18n: AnyObject;
  associations: AssociationsOptions;
  _hooks: { [key: string]: HookFunction[] };
  options: ResourceDefinition;
  _isResourceConstructor: boolean;
  buildVariableNamesByVariables(variables: AnyObject): {
    define: string;
    apply: string;
  };
  buildVariableNames: (params: AnyObject) => {
    define: string;
    apply: string;
  };
  fragments: Record<string, string | ((...args: any) => string)>;

  new (attributes?: AnyObject | Resource, options?: AnyObject): TInstace;
  useStore: StoreDefinition;
  ensureNodeId(id: any): string;
  buildQuery(opts: any): any;
  sanitizeHtml(html: string): string;
  parseEmoji(html: string): string;
  parseMarkdown(markdown: string): string;
  /*
  getColumnsByFragments('user', 'users');
  => `
  users {
    id
    username
  }
  `
  */
  getColumnsByFragment(name: string | string[], base?: string): string;
  toStore(options?: DefineStoreOptionsBase<StateTree, Store>): StoreDefinition;
  toModel(options?: AnyObject): AnyObject;
  mapAccessor(options: any): AnyObject;
  // urls
  indexUrl: (urlOptions?: UrlOptions) => string;
  showUrl: (id: string, urlOptions?: UrlOptions) => string;
  editUrl: (id: string, urlOptions?: UrlOptions) => string;
  newUrl: (attributes?: AnyObject) => string;
  query(
    str: string,
    variables?: AnyObject,
    options?: AnyObject
  ): Promise<ApolloQueryResult<any>>;
  mutate(str: string, variables?: AnyObject, options?: AnyObject): Promise<any>;
  gql(gql: string): DocumentNode;
  /**
   * @param str 可以是字符串， 也可以是gql``返回的数据， 最终返回的是gql``之后的数据
   */
  ensureGql(str: string): DocumentNode;
  updateAll(options: any): any;
  log: (...args: any[]) => void;
  parseVariableNames: (variableNames: object) => {
    define: string;
    apply: string;
  };
  buildColumns: (
    columns: string,
    baseColumns?: string,
    fragments?: string[] | string
  ) => string;
  buildGql: (options: BuildGqlOptions) => string | DocumentNode;
  addHook(name: string, func: HookFunction): any | void;
  runHooks(name: string, ...args: any[]): void;

  computeStates(errors: AnyObject): AnyObject;
  getAttributes(attrs?: AnyObject): AnyObject;
  formatAttributes(attrs?: AnyObject): AnyObject;
  find(id: ID | ID[], options?: FindOptions): Promise<Resource | Resource[]>;
  findRaw(
    id: ID | ID[],
    options?: FindOptions
  ): Promise<void | AnyObject | AnyObject[]>;
  findAll(options?: FindOptions): Promise<Resource[]>;
  findAllRaw(options?: FindOptions): Promise<Connection>;
  destroy(id: string, options?: object): Promise<Resource>;
  update(id: string, attributes: object, options?: object): Promise<Resource>;
  getConnection(options?: ConnectionQueryOptions): ConnectionClass;
  // node id
  parseNodeId(id: ID): null | { id: string; type: string };
  isValidNodeId(id: ID): boolean;
  createNodeId(id: string): ID;
  [key: string]: any;
}

export type { ConnectionClass };

export interface Resource {
  indexUrl(urlOptions?: UrlOptions): string;
  newUrl(attributes?: AnyObject): string;
  showUrl(urlOptions?: UrlOptions): string;
  editUrl(urlOptions?: UrlOptions): string;

  // instance
  toGraph(): {
    [key in BaseGraphFieldNames]: string;
  } & {
    image: ActiveStorageURL;
  };
  _connections: Record<string, Connection>; // 缓存的connection
  _resources: Record<string, Resource>; // 存储关联的resource
  $apollo: ApolloClient<AnyObject>;
  cloneAttributes: AnyObject;
  updateAttributes(attrs: AnyObject): void;
  getConnection(options?: ConnectionQueryOptions | string): ConnectionClass;
  save(options?: object): Promise<Resource>;
  update(options?: object): Promise<Resource>;
  destroy(options?: object): Promise<Resource>;
  create(options?: object): Promise<Resource>;
  attributes: AnyObject;
  _attributes: AnyObject;
  klass: ResourceClass;
  _isResource: boolean;
  $proxy: AnyObject;
  getAttributes(): AnyObject;
  computeStates(): AnyObject;
  isNewRecord(): boolean;
  beforeDestroy(options?: object): boolean;
  afterDestroy(options?: object): boolean;
  beforeUpdate(options?: object): boolean;
  afterUpdate(options?: object): boolean;
  beforeCreate(options?: object): boolean;
  afterCreate(options?: object): boolean;
  [key: string]: any;
}
export interface AnchorRes extends Resource {
  displayName: string;
  formattedDescription: string;
}

type DirectiveLocation =
  | 'QUERY'
  | 'MUTATION'
  | 'FIELD'
  | 'FRAGMENT_DEFINITION'
  | 'FRAGMENT_SPREAD'
  | 'INLINE_FRAGMENT'
  | 'VARIABLE_DEFINITION'
  | 'SCHEMA'
  | 'SCALAR'
  | 'OBJECT'
  | 'FIELD_DEFINITION'
  | 'ARGUMENT_DEFINITION'
  | 'INTERFACE'
  | 'UNION'
  | 'ENUM'
  | 'ENUM_VALUE'
  | 'INPUT_OBJECT'
  | 'INPUT_FIELD_DEFINITION';

type TypeKind =
  | 'SCALAR'
  | 'OBJECT'
  | 'INTERFACE'
  | 'UNION'
  | 'ENUM'
  | 'INPUT_OBJECT'
  | 'LIST'
  | 'NON_NULL';

interface Directive {
  name: string;
  description?: string;
  isRepeatable: boolean;
  locations: DirectiveLocation[];
  args: InputValue[];
}

export interface OfType {
  kind: TypeKind;
  name: string | null;
  ofType: OfType | null;
}

export interface InputValue {
  name: string;
  type: OfType;
  description?: string;
  defaultValue?: any;
  isDeprecated?: boolean;
  deprecationReason?: string;
}

export interface Field {
  name: string;
  description?: string;
  args: InputValue[] | null;
  type: OfType | null;
}

export interface Type {
  name?: string | null;
  kind?: TypeKind;
  ofType?: OfType | null;
  description?: string;
  fields?: Field[] | null;
  inputFields?: InputValue[] | null;
  interfaces?: OfType[] | null;
  specifiedByUrl?: string;
  enumValues?: Type[] | null;
  possibleTypes?: OfType[] | null;
}

export interface Schema {
  queryType: Type;
  mutationType: Type;
  subscriptionType: Type;
  types: Type[];
  directives?: {
    name: string;
    description?: string;
    locations: string[];
    args: InputValue[];
  } | null;
}

export interface ToQueryStringOptions {
  maxDepth?: number;
  depth?: number;
}

export type Fragment =
  | AnyObject
  | string
  | ((options: ToQueryStringOptions) => string);

export type AbilityVariables = {
  id?: string;
  type?: string;
  name: string;
};
