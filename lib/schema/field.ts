import _ from 'lodash';
import { Field as RawField, ToQueryStringOptions } from '../../types';
import InputValue from './input-value';
import type { Schema } from '../schema';
import OfType from './of-type';

class Field {
  data: RawField;

  schema: Schema;

  constructor(schema: Schema, data: RawField) {
    this.data = data;
    this.schema = schema;
  }

  get fullType() {
    return this.type?.fullType;
  }

  get isConnection() {
    return this.fullType?.isConnection;
  }

  get resourceClass() {
    return this.fullType?.resourceClass;
  }

  toVariableNames() {
    const variableNames: Record<string, string> = {};
    _.each(this.arguments, (arg) => {
      variableNames[arg.name] = arg.type.signature;
    });
    return variableNames;
  }

  toFragment(options: ToQueryStringOptions = { maxDepth: 2 }) {
    const { depth, maxDepth } = _.defaults(options, { depth: 1, maxDepth: 1 });
    // return this.toQueryString(options);
    const { fullType } = this.type || {};
    if (fullType) {
      const fullTypeQueryString = fullType.toQueryString({
        depth: depth + 1,
        maxDepth: this.isConnection ? 3 : maxDepth, // 如果是connection，则最大深度为3, 因为小于此数值，会返回空block
      });
      return fullTypeQueryString;
    }
    return this.name;
  }

  toQueryString(options: ToQueryStringOptions = {}) {
    const { depth, maxDepth } = _.defaults(options, { depth: 1, maxDepth: 1 });
    const padding = _.repeat('   ', depth);
    const { fullType } = this.type || {};
    if (fullType) {
      const currentDepth = depth + 1;
      const fullTypeQueryString = fullType.toQueryString({
        depth: currentDepth,
        maxDepth,
      });
      // 如果整个块为空，则连本字段都省却
      if (!fullTypeQueryString.trim()) {
        return `${padding}# ${this.name} is empty (reach max depth: ${currentDepth}/${maxDepth})`;
      }
      return `${padding}${this.name} {
${fullTypeQueryString}
${padding}}`;
    }
    return `${padding}${this.name}`;
  }

  get isNode() {
    return this.type?.isNode;
  }

  get isScalar() {
    return this.type?.isScalar;
  }

  get isObject() {
    return this.type?.isObject;
  }

  get type(): OfType | null {
    if (this.data.type) {
      return new OfType(this.schema, this.data.type);
    }
    return null;
  }

  get name(): string {
    return this.data.name;
  }

  get description(): string {
    return this.data.description || '';
  }

  get args() {
    return this.arguments;
  }

  get arguments() {
    return this.data.args?.map((arg) => new InputValue(this.schema, arg)) || [];
  }

  get argumentsHash(): Record<string, InputValue> {
    return _.keyBy(this.arguments, 'name');
  }

  /**
   * 根据传入的变量， 对比introspection.query.arguments
   * 返回变量中存在的变量类型
   * @param variables 变量对象
   * @returns {Record<string, string>}
   */
  queryVariableTypesByVariables(variables: AnyObject) {
    const result: any = {};
    const variableNames = _.keys(variables);
    let signature = null;
    const allVariableNames: Record<string, string> = this.toVariableNames();
    _.each(variableNames, (variableName, index) => {
      signature = allVariableNames[variableName];
      if (signature) {
        result[variableName] = signature;
      } else {
        throw new Error(`unknow variable type error ${variableName}`);
      }
    });
    // console.log("result",result)
    return result;
  }

  /**
   * 根据传入的variable
   * 生成 query 使用的 gql 变量定义跟变量使用
   * @param variable 变量对象
   * @returns {define: string, apply: string}
   */
  queryVariableObject(variable: Record<string, any>) {
    return Field.parseVariableNames(
      this.queryVariableTypesByVariables(variable)
    );
  }

  // eslint-disable-next-line class-methods-use-this
  parseVariableNames(variableNames: any) {
    return Field.parseVariableNames(variableNames);
  }

  /**
   * 根据变量名称解析变量对象
   * ```ts
   * Field.parseVariableNames({k: 'String', foo: 'Boolean', bar: 'Int'})
   * // {define: '$k: String, $foo: Boolean, $bar: Int', apply: 'k: $k, foo: $foo, bar: $bar'}
   * ```
   * @param variableNames
   * @returns {define: string, apply: string}
   */
  static parseVariableNames(variableNames: any) {
    const defineArr: string[] = [];
    const applyArr: string[] = [];
    _.each(variableNames, (v, k) => {
      defineArr.push(`$${k}: ${v}`);
      applyArr.push(`${k}: $${k}`);
    });
    return {
      define: defineArr.join(', '),
      apply: applyArr.join(', '),
    };
  }
}

export default Field;
