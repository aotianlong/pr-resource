import _ from 'lodash';
import gql from 'graphql-tag';
import type { FetchResult } from 'apollo-link';
import { Base64 } from 'js-base64';
import { getConfig } from './config';
import {
  AnyObject,
  PageInfo,
  Edge,
  FindOptions,
  Connection as IConnection,
  ResourceClass,
  Resource,
  BuildGqlOptions,
  QueryOptions,
  ID,
} from '../types';

interface ConnectionOptions {
  resourceClass: ResourceClass;
  resource?: Resource;
  connectionName?: string;
  // connection?: IConnection<AnyObject>;
}

class Connection {
  static defaultPageInfo: PageInfo = {
    hasNextPage: true,
    hasPreviousPage: false,
    startCursor: Base64.encode('0'),
    endCursor: Base64.encode('0'),
  };

  static fromResourceClass(resourceClass: ResourceClass) {
    return new Connection({ resourceClass });
  }

  static fromResource(resource: Resource, connectionName: string) {
    const cachedConnection = resource._connections[connectionName];
    if (cachedConnection) {
      return cachedConnection;
    }
    const field = resource.klass.type.getField(connectionName);
    console.log('field', field, connectionName);
    const resourceClass = field?.fullType?.resourceClass;
    const newConnection = new Connection({
      resource,
      connectionName,
      resourceClass,
    });
    resource._connections[connectionName] = newConnection;
    return newConnection;
  }

  static _isConnectionClass = true;

  static defaultPageSize = 20;

  _isConnection = true;

  options = {};

  resource?: Resource;

  findOptions: FindOptions = {};

  /*
   */
  // 用于查询graphql的时候的名称
  connectionName?: string;

  // 用于查询grpahql的时候的 ... on XXX

  loading = false;

  error: null | string = null;

  resourceClass: ResourceClass;

  nodes: AnyObject[] = [];

  edges: Edge<unknown>[] = [];

  pageInfo: PageInfo = _.cloneDeep(Connection.defaultPageInfo);

  /*
  @param resourceOrClass
  可以是一个resource, 也可以是一个resourceClass
  如果是resource, 会自动推算出resourceClass
  每次加载更多的时候，会更新resource的_attributes属性
  */
  constructor(options: ConnectionOptions) {
    this.resourceClass = options.resourceClass;
    this.resource = options.resource;
    this.connectionName = options.connectionName;
    const Klass = this.resourceClass;
    const connection = this.getResourceRawValue(); // this.resource?.get(this.connectionName);
    if (connection) {
      if (connection.pageInfo) {
        this.pageInfo = connection.pageInfo;
      }
      if (connection.nodes) {
        this.nodes = connection.nodes.map((node: AnyObject) => {
          return new Klass(node);
        });
      }
      if (connection.edges) {
        this.edges = connection.edges;
      }
    }
  }

  get isCompleted() {
    return !this.pageInfo.hasNextPage;
  }

  set isCompleted(v) {
    this.pageInfo.hasNextPage = !v;
  }

  get length() {
    return this.nodes.length;
  }

  get __typename() {
    // 先尝试从resource上读取
    let typename = this.resource?.get(`${this.connectionName}.__typename`);
    if (!typename) {
      typename = `${this.resourceClass.name}Connection`;
    }
    return typename;
  }

  toRaw(): IConnection {
    return {
      nodes: this.nodes,
      edges: this.edges,
      pageInfo: this.pageInfo,
      __typename: this.__typename,
    };
  }

  refresh() {
    this.isCompleted = false;
    this.loadMore();
    return this;
  }

  isEmpty() {
    return !this.nodes.length;
  }

  getResourceRawValue() {
    if (this.resource) {
      return this.resource.get(this.connectionName);
    }
    return null;
  }

  // 添加进connection
  append(node: AnyObject) {
    console.log('append', node);
    const nextCursor = Base64.encode(
      String(
        parseInt(Base64.decode(this.pageInfo?.endCursor as string), 10) + 1
      )
    );
    this.nodes.push(node);
    this.edges.push({
      node,
      cursor: nextCursor,
    });
    this.pageInfo.endCursor = nextCursor;
    return this;
  }

  prepend(node: AnyObject) {
    console.log('prepend', node);
    const nextCursor = Base64.encode(
      String(
        parseInt(Base64.decode(this.pageInfo?.startCursor || '1'), 10) - 1
      )
    );
    this.nodes.unshift(node);
    console.log('nodes', this.nodes);
    this.edges.unshift({
      node,
      cursor: nextCursor,
    });
    this.pageInfo.startCursor = nextCursor;
    return this;
  }

  // 删除一个node
  remove(nodeId: ID) {
    const index = this.nodes.findIndex((node) => node.id === nodeId);
    if (index === -1) {
      return this;
    }
    this.nodes.splice(index, 1);
    this.edges.splice(index, 1);
    return this;
  }

  // 插入一个 node 到指定位置
  insert(node: AnyObject, index: number) {
    const nextCursor = Base64.encode(
      String(
        parseInt(Base64.decode(this.pageInfo?.endCursor as string), 10) + 1
      )
    );
    this.nodes.splice(index, 0, node);
    this.edges.splice(index, 0, {
      node,
      cursor: nextCursor,
    });
    this.pageInfo.endCursor = nextCursor;
    return this;
  }

  merge(connection: IConnection) {
    console.log('merging', connection);
    this.nodes = [...this.nodes, ...(connection.nodes || [])] as AnyObject[];
    this.edges = [...this.edges, ...(connection.edges || [])];
    if (connection.pageInfo) {
      this.pageInfo = _.cloneDeep(connection.pageInfo);
    }
    return this;
  }

  replace(connection: IConnection): this {
    console.log('replace connection', connection);
    // this.convertNodesToResource(connection);
    this.nodes = (connection.nodes as AnyObject[]) || [];
    this.edges = (connection.edges as Edge<unknown>[]) || [];
    this.pageInfo = connection.pageInfo as PageInfo;
    return this;
  }

  convertNodesToResource(connection: IConnection) {
    const Klass = this.resourceClass;
    if (Klass) {
      const resources = connection.nodes?.map(
        (node) => new Klass(node as AnyObject)
      );
      connection.nodes = resources;
    } else {
      console.log('unknow resourceClass cant convert nodes to resource');
    }
  }

  reset() {
    console.log('connection reset');
    this.nodes = [];
    this.edges = [];
    this.pageInfo = _.cloneDeep(Connection.defaultPageInfo);
    this.error = null;
    // this.findMore()
    return this;
  }

  setFindOptions(findOptions: FindOptions) {
    this.findOptions = { ...findOptions };
  }

  loadMore(options = {}): Promise<void | IConnection> {
    if (this.loading) {
      return Promise.reject(new Error('loading'));
    }

    if (this.isCompleted) {
      return Promise.reject(new Error('complete'));
    }
    console.log('find options', this.findOptions, this.pageInfo);
    const connectionOptions = _.cloneDeep(this.findOptions);
    connectionOptions.variables ||= {};
    connectionOptions.variables.after = _.cloneDeep(this.pageInfo.endCursor);
    this.loading = true;
    if (this.resource) {
      return this._loadMoreByResource(connectionOptions).finally(() => {
        this.loading = false;
      });
    }
    return this._loadMoreByResourceClass(connectionOptions).finally(() => {
      this.loading = false;
    });
  }

  _loadMoreByResourceClass(connectionOptions: QueryOptions) {
    console.log('load more by resource class', connectionOptions);
    return this.resourceClass
      .findAllRaw(connectionOptions)
      .then((conn) => {
        this.convertNodesToResource(conn);
        this.merge(conn);
        return conn;
      })
      .catch((e) => {
        console.log('error', e);
        // reject(new Error('error'))
        this.isCompleted = true;
      })
      .finally(() => {
        this.loading = false;
      });
  }

  loadMoreByResourceQueryStr(connectionOptions: BuildGqlOptions, bare = false) {
    const { className } = (this.resource as Resource).klass; // this.resourceClass;
    const { connectionName } = this;
    const variables = _.cloneDeep(connectionOptions.variables || {});
    delete variables.id;
    const variableNames =
      this.resourceClass.buildVariableNamesByVariables(variables);
    let { define, apply } = variableNames;
    if (define) {
      define = `,${define}`;
    }
    if (apply) {
      apply = `(${apply})`;
    }
    const columns = this.resourceClass.buildColumns(
      connectionOptions.columns as string
    );

    console.log('columns', this.resourceClass, columns, connectionOptions);

    const bareStr = `
      ${connectionName}${apply} {
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        nodes {
          ${columns}
        }
      }
    `;
    const queryStr = `
    query($id: NodeId!${define}) {
      node(id: $id) {
        ... on ${className} {
          ${bareStr}
        }
      }
    }
    `;
    console.log('connection query', queryStr);
    if (bare) {
      return bareStr;
    }
    return queryStr;
  }

  _loadMoreByResource(connectionOptions: BuildGqlOptions) {
    const config = getConfig();
    const { apollo } = config;
    console.log('load more by resource', connectionOptions);
    const variables = connectionOptions.variables || {};
    // !!!! 这个地方很奇怪， 没时间研究， 但是确实很奇怪
    // 到这个地方的时候 this.resource?.id 不能返回正确的id, 返回的是undefined
    // 不清楚什么情况，可能是被我写的太复杂了。
    variables.id = this.resource?._attributes?.id;
    const queryStr = this.loadMoreByResourceQueryStr(connectionOptions);
    return apollo
      .query({
        query: gql`
          ${queryStr}
        `,
        variables,
      })
      .then((response: FetchResult<any>) => {
        const node = response.data?.node as AnyObject;
        const connection = _.get(node, `${this.connectionName}`) as IConnection;
        this.convertNodesToResource(connection);
        this.merge(connection);
        return connection;
      });
  }

  toString() {
    const { nodes } = this;
    return `<Connection nodes(${nodes.length})=${JSON.stringify(
      nodes.map((n) => n.toString())
    )}, pageInfo=${JSON.stringify(this.pageInfo)}, resourceClass=${
      this.resourceClass
    }, connectionName=${this.connectionName}, resourceClass=${
      this.resourceClass
    }, resource=${this.resource}>`;
  }

  clone() {
    const connection = new Connection({
      resourceClass: this.resourceClass,
      resource: this.resource,
      connectionName: this.connectionName,
    });
    connection.nodes = this.nodes.map((node) => _.cloneDeep(node));
    connection.edges = this.edges.map((edge) => _.cloneDeep(edge));
    connection.pageInfo = _.cloneDeep(this.pageInfo);
    connection.resource = this.resource;
    return connection;
  }
}

export { Connection };
export default Connection;
