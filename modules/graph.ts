import _ from 'lodash';
import {
  AnyObject,
  ModuleDefinition,
  Resource,
  GraphResolvers,
} from '../types';

const defultGraphResolvers: GraphResolvers = {
  title: (resource: Resource) =>
    resource.title || resource.name || resource.subject || 'untitled',
  type: 'article',
  image: (resource: Resource) =>
    resource.image ||
    resource.imageUrl ||
    (_.isArray(resource.images) ? resource.images[0] : '') ||
    (_.isArray(resource.imageUrls) ? resource.imageUrls[0] : ''),
  url: (resource: Resource) => resource.showUrl(),
  description: (resource: Resource) =>
    resource.description ||
    resource.content ||
    resource.body ||
    resource.formattedBody ||
    '',
  siteName: (resource: Resource) => resource.siteName || '',
  video: (resource: Resource) => resource.videosrc || resource.videoUrl || '',
  audio: (resource: Resource) => resource.audiosrc || resource.audioUrl || '',
};

/**
 * ```ts
 * createResource({
 *   graphResolvers: {
 *     title(obj) {
 *       return 'title';
 *     }
 *   }
 * })
 * ```
 */
const useModule = function useModule<T>(): ModuleDefinition {
  const mod: ModuleDefinition = {
    methods: {
      // 生成一个open graph可以使用的对象
      /*
        og:title 标题
        og:type 类型 常用值:article book movie
        og:image 略缩图地址
        og:url 页面地址
        og:description 页面的简单描述
        og:site_name 页面所在网站名
        og:videosrc 视频或者Flash地址
        og:audiosrc 音频地址
      */
      toGraph() {
        const graphResolvers = _.defaults(
          this.klass.options.graphResolvers || {},
          defultGraphResolvers
        );
        const graph: AnyObject = {};
        _.each(graphResolvers, (resolver, key) => {
          if (_.isString(resolver)) {
            graph[key] = resolver;
          } else {
            const value = resolver(this);
            if (value) {
              graph[key] = value;
            } else {
              graph[key] = '';
            }
          }
        });
        // 用于兼容underscore名称
        graph.site_name = graph.siteName;
        return graph;
      },
    },
  };
  return mod;
};

export default useModule;
