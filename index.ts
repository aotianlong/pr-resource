import _ from 'lodash';
import createResource from './create-resource';
import { resourceClasses } from './lib/resource-classes';
import { parse, create } from './lib/node-id';
import schema from './lib/schema';
import ability from './lib/queries/ability';
import {
  toResource,
  idToResource,
  toResourceClass,
  isResource,
  isResourceClass,
  imageVariant,
  matchRule,
  blobUrlToId,
} from './lib/utils';

export {
  toResource,
  idToResource,
  toResourceClass,
  isResource,
  isResourceClass,
  imageVariant,
  matchRule,
  ability,
  blobUrlToId,
};
export { resourceClasses };
export { schema as Schema };
export { parse as parseNodeId, create as createNodeId };
export default createResource;
