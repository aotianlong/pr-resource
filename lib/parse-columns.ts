import _ from 'lodash';
import { AnyObject, Column } from '../types';
import { toResourceClass } from './utils';
import Type from './schema/type';

type Fragment = string | ((...args: any) => string);

/**
 * 根据一个inputType来获取attrs中的数据
 * @param attrs AnyObject
 * @param type inputType
 * @returns AnyObject
 */
export function getAttributes(
  attrs: AnyObject = {},
  type: Type,
  ignoreList = false
): AnyObject {
  const result: AnyObject = {};
  _.each(type.inputFields, (field) => {
    const key = field.name;
    const { fullType } = field;
    if (fullType && !ignoreList) {
      if (field.type.isList) {
        result[key] = ((attrs[key] as any[]) || []).map((v) => {
          return getAttributes(v, fullType);
        });
      } else {
        result[key] =
          attrs[key] && getAttributes(attrs[key] as AnyObject, fullType);
      }
    } else {
      result[key] = attrs[key];
    }
  });
  return result;
}

/**
 * 格式化 columns 参数
 * 1. 如果是数组，则会解析每个元素，一个元素一行
 * 比如: ['foo', 'bar', {foo2: 'bar2'}]
 * 会解析成:
 * {
 *   foo
 *   bar
 *   foo2 {
 *     bar2
 *   }
 * }
 * 2. 如果是object，会添加一层
 * 比如: {foo: 'bar'}
 * 会解析成:
 * {
 *  foo {
 *   bar
 *  }
 * }
 * 3. 如果是字符串,会原样返回
 * 比如: 'foo'
 * 会解析成:
 * foo
 * @param column
 * @param depth
 * @returns
 */
export function formatColumns(column: Column | Column[], depth = 0): string {
  const nextDepth = depth + 1;
  const padding = _.repeat('  ', depth);
  if (_.isString(column)) {
    return `${padding}${column}`;
  }
  if (_.isPlainObject(column)) {
    const keys = Object.keys(column);
    const values: string[] = keys.map((key) => {
      const convertedColumns = formatColumns(
        (column as Record<string, Column[]>)[key],
        nextDepth
      );
      if (convertedColumns) {
        return `${padding}${key} {
${convertedColumns}
${padding}}`;
      }
      return '';
    });
    return values.join('\n');
  }
  if (_.isArray(column)) {
    if (column.length) {
      return _.compact(
        (<Column[]>column).map((c) => formatColumns(c, nextDepth))
      ).join('\n');
    }
    return '';
  }
  return '';
}

/**
 * # will expand to
 * + commments
 * + User.columns
 * @param line
 * @returns
 */
function parseLine(line: string) {
  const lineRegexp = /^\s*\+([=])?\s*([\w.]*)(:(\w*))?/;
  const match = line.match(lineRegexp);
  if (match) {
    const [, flags, name, , alias] = match;
    const noBlock = flags?.includes('=');
    return {
      noBlock,
      name,
      alias,
    };
  }
  return null;
}

/**
 * expandAbsoluteFragments('User.base');
 * expandAbsoluteFragments('User.default');
 * @param fragment
 * @returns
 */
export function expandAbsoluteFragment(fragment: string) {
  const parts: string[] = fragment.split('.');
  const [resourceClassName, fragmentName] = parts;
  const resourceClass = toResourceClass(resourceClassName);
  if (resourceClass) {
    const result = resourceClass.fragments[fragmentName];
    if (result) return result;
  }
  return `# expand absolute fragmnet ${fragment} not found`;
}

/**
 * 解析columns
 * `
 * + Post.columns
 * # will expand to Post.columns
 * +
 * + user
 * + album 3
 * + post 3
 * foo
 * bar {
 *   id
 *   name
 * }
 * - foo
 * - bar.id
 * - bar.name
 * `
 * 凡是+开头的， 都认为是fragment, 需要被展开
 * 可以被解析成
 * 凡是-开头的， 就是从字段中删除
 * @param columns
 * @param fragments
 */
export default function parseColumns(
  columns: Column | Column[],
  fragments: Record<string, Fragment> = {}
) {
  const str = formatColumns(columns);
  const result: Fragment[] = [];
  const lines = str.split(/[\r\n]/);
  const fragmentMaxDepth = 1;
  _.each(lines, (line) => {
    const lineInfo = parseLine(line);
    if (lineInfo) {
      const fragmentName = lineInfo.name;
      if (fragmentName.includes('.')) {
        result.push(expandAbsoluteFragment(fragmentName));
        return;
      }
      const aliasName = lineInfo.alias;
      const fragment = fragments[fragmentName];
      if (fragment) {
        let fragmentStr = '';
        if (_.isFunction(fragment)) {
          fragmentStr = fragment({ maxDepth: fragmentMaxDepth });
        } else {
          fragmentStr = fragment;
        }
        if (!['base'].includes(fragmentName) && !lineInfo.noBlock) {
          fragmentStr = `${aliasName || fragmentName} {\n${fragmentStr}\n}`;
        }
        result.push(fragmentStr);
      } else {
        // 当 fragmentName为空的时候，填充fragments.default
        // eslint-disable-next-line no-lonely-if
        if (!fragmentName) {
          result.push(fragments.default);
        } else {
          console.log(`fragment: ${fragmentName} not found.`);
        }
      }
    } else {
      result.push(line);
    }
  });
  return result.join('\n');
}

export { parseColumns };
