import _ from 'lodash';
import { OfType as RawOfType } from '../../types';
import type { Schema } from '../schema';

class OfType {
  data: RawOfType;

  schema: Schema;

  constructor(schema: Schema, data: RawOfType) {
    this.schema = schema;
    this.data = data;
  }

  get name() {
    return this.type.name;
  }

  get kind() {
    return this.data.kind;
  }

  get isScalar() {
    return _.some(this.ofTypes, { kind: 'SCALAR' });
  }

  get isObject() {
    return _.some(this.ofTypes, { kind: 'OBJECT' });
  }

  get isNull() {
    return !this.isNonNull;
  }

  get isNonNull() {
    return (_.first(this.ofTypes) as RawOfType).kind === 'NON_NULL';
  }

  get isList() {
    return _.some(this.ofTypes, { kind: 'LIST' });
  }

  get isListNonNull() {
    const index = _.findIndex(this.ofTypes, { kind: 'LIST' });
    const prevIndex = index - 1;
    return this.ofTypes[prevIndex]?.kind === 'NON_NULL';
  }

  get signature() {
    let typeSignature = '';
    if (this.isNonNull) {
      typeSignature = `${this.type.name}!`;
    } else {
      typeSignature = `${this.type.name}`;
    }

    if (this.isList) {
      if (this.isListNonNull) {
        typeSignature = `[${typeSignature}]!`;
      } else {
        typeSignature = `[${typeSignature}]`;
      }
    }
    return typeSignature;
  }

  get type(): RawOfType {
    return _.last(this.ofTypes) as RawOfType;
  }

  get fullType() {
    if (['OBJECT', 'INTERFACE', 'INPUT_OBJECT'].includes(this.type.kind)) {
      return this.schema.getType(this.type.name as string);
    }
    return null;
  }

  get ofTypes(): RawOfType[] {
    const result = [];
    let ofType: RawOfType | null = this.data;
    while (ofType) {
      result.push(ofType);
      ofType = ofType.ofType;
    }
    return result;
  }

  get isNode(): boolean {
    return !!this.fullType?.isNode;
  }

  get ofType(): OfType | null {
    if (this.data.ofType) {
      return new OfType(this.schema, this.data.ofType);
    }
    return null;
  }
}

export default OfType;
