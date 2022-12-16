import _ from 'lodash';
import type {
  OfType,
  Type as Data,
  Field as FieldData,
  ToQueryStringOptions,
  Column,
} from '../../types';
import Field from './field';
import InputValue from './input-value';
import type { Schema } from '../schema';
import { toResourceClass } from '../utils';

class Type {
  data: Data;

  schema: Schema;

  constructor(schema: Schema, data: Data | OfType) {
    this.data = data;
    this.schema = schema;
  }

  get name() {
    return this.data.name;
  }

  get inputType(): Type | null {
    if (this.isNode) {
      const typeName = `${this.name}Attributes`;
      return this.schema.getType(typeName);
    }
    return null;
  }

  get inputFields() {
    return (
      this.data.inputFields?.map(
        (field) => new InputValue(this.schema, field)
      ) || []
    );
  }

  get inputFieldsHash() {
    return _.keyBy(this.inputFields, 'name');
  }

  get inputFieldNames() {
    return _.map(this.inputFields, 'name');
  }

  getInputField(name: string) {
    return this.inputFieldsHash[name];
  }

  get isNonNull() {
    return this.data.kind === 'NON_NULL';
  }

  get isScalar() {
    return this.data.kind === 'SCALAR';
  }

  get isUnion() {
    return this.data.kind === 'UNION';
  }

  get isEnum() {
    return this.data.kind === 'ENUM';
  }

  get isInterface() {
    return this.data.kind === 'INTERFACE';
  }

  get isObject() {
    return this.data.kind === 'OBJECT';
  }

  get isInputObject() {
    return this.data.kind === 'INPUT_OBJECT';
  }

  get isList() {
    return this.data.kind === 'LIST';
  }

  get interfaces() {
    return this.data.interfaces || [];
  }

  get interfacesHash(): Record<string, OfType> {
    return _.keyBy(this.interfaces, 'name');
  }

  get isNode() {
    return !!this.interfacesHash.Node;
  }

  get connectionFields() {
    return _.filter(this.fields, 'isConnection');
  }

  get connectionFieldsHash() {
    return _.keyBy(this.connectionFields, 'name');
  }

  get scalarFields() {
    return _.filter(this.fields, 'isScalar');
  }

  get scalarFieldsHash() {
    return _.keyBy(this.scalarFields, 'name');
  }

  get objectFields() {
    return _.filter(this.fields, 'isObject');
  }

  get objectFieldsHash() {
    return _.keyBy(this.objectFields, 'name');
  }

  get fields(): Field[] {
    return (
      this.data.fields?.map((field) => new Field(this.schema, field)) || []
    );
  }

  get fieldsHash(): Record<string, Field> {
    return _.keyBy(this.fields, 'name');
  }

  getField(name: string) {
    return this.fieldsHash[name];
  }

  get fieldNames() {
    return _.map(this.fields, 'name');
  }

  get isConnection() {
    const { fieldNames } = this;
    if (
      fieldNames.includes('edges') &&
      fieldNames.includes('pageInfo') &&
      fieldNames.includes('nodes') &&
      this.name?.match(/Connection$/)
    ) {
      return true;
    }
    return false;
  }

  get resourceClass() {
    if (this.isConnection) {
      const { name } = this;
      const typeName = name?.replace(/Connection$/, '');
      return toResourceClass(typeName);
    }
    return toResourceClass(this.name);
  }

  toQueryString(options: ToQueryStringOptions = {}): string {
    const { depth, maxDepth } = _.defaults(options, { depth: 1, maxDepth: 1 });
    const fields = depth < maxDepth ? this.fields : this.scalarFields;
    const queryString = _.map(fields, (field) =>
      field.toQueryString({
        depth: depth + 1,
        maxDepth,
      })
    ).join('\n');
    // queryString = `"""\nok\n"""\n${queryString}`;
    return queryString;
  }

  expandColumns(): Column[] {
    const result = _.compact(
      _.map(this.fields, (field) => {
        if (field.isScalar) {
          return field.name;
        }
        if (field.type?.fullType?.isConnection) {
          // do nonthing
        }
        if (field.isNode) {
          const type = this.schema.getType(field.type?.name as string);
          if (type) {
            return {
              [field.name]: type.expandColumns(),
            };
          }
          return field.name;
        }
        return null;
      })
    );
    return result;
  }

  // 生成 fragments
  /**
   * {
   * }
   */
  toFragments() {
    const fragments: Record<
      string,
      string | ((options: ToQueryStringOptions) => string)
    > = {};
    _.each(this.objectFields, (field) => {
      fragments[field.name] = field.toFragment.bind(field);
    });

    const scalarFields = _.map(this.scalarFields, 'name').join('\n');
    // fragments.base = (options: ToQueryStringOptions = {}) => scalarFields;
    fragments.base = scalarFields;

    return fragments;
  }
}

export default Type;
