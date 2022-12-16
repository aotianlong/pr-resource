import Resource, { use, mountedCallbacks } from './base';
import baseModule from '../../modules/base';
import attributesModule from '../../modules/attributes';
import gqlModule from '../../modules/gql';
import i18nModule from '../../modules/i18n';
import findModule from '../../modules/find';
import fieldsModule from '../../modules/fields';
import columnsModule from '../../modules/columns';
import urlsModule from '../../modules/urls';
import validationModule from '../../modules/validation';
import modelModule from '../../modules/model';
import variableNamesModule from '../../modules/variable-names';
import logModule from '../../modules/log';
import fragmentsModule from '../../modules/fragments';
import hooksModule from '../../modules/hooks';
import formatModule from '../../modules/format';
import serializeModule from '../../modules/serialize';
import piniaModule from '../../modules/pinia';
import connectionModule from '../../modules/connection';
import batchModule from '../../modules/batch';
import routesModule from '../../modules/routes';
import introspectionModule from '../../modules/introspection';

use(baseModule);
use(attributesModule);
use(gqlModule);
use(i18nModule);
use(findModule);
use(fieldsModule);
use(columnsModule);
use(urlsModule);
use(validationModule);
use(modelModule);
use(variableNamesModule);
use(logModule);
use(fragmentsModule);
use(hooksModule);
use(formatModule);
use(serializeModule);
use(piniaModule);
use(connectionModule);
use(batchModule);
use(routesModule);
use(introspectionModule);

export { mountedCallbacks };
export default Resource;
