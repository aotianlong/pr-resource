import moment, { Moment, MomentInput } from 'moment';
import emojiJson from 'markdown-it-emoji/lib/data/full.json';
import sanitizeHtml from 'sanitize-html';
import { marked } from 'marked';
import _ from 'lodash';
import { ModuleDefinition, ResourceClass } from '../types';

function parseVideos(text: string): string {
  const config = {
    youtube: {
      find: /^\s*https?:\/\/www\.youtube\.com\/watch\?v=(\w+)&?.*?$/gm,
      replace: 'https://www.youtube.com/embed/$1',
    },
    qq: {
      // https://v.qq.com/x/cover/mzc00200016zk9d/k0044xauzt4.html
      find: /^\s*https?:\/\/v\.qq\.com\/x\/cover\/\w+\/(\w+)\.html.*?$/gm,
      replace: 'https://v.qq.com/txp/iframe/player.html?vid=$1',
    },
    huya: {
      // https://www.huya.com/688
      find: /^\s*https?:\/\/www\.huya\.com\/(\w+)/gm,
      replace: 'https://liveshare.huya.com/iframe/$1',
    },
    youku: {
      // https://v.youku.com/v_show/id_XNTkwNDUxNTQ4MA==.html?spm=a2ha1.14919748_WEBHOME_GRAY.drawer5.d_zj1_3&scm=20140719.rcmd.7182.video_XNTkwNDUxNTQ4MA%3D%3D
      // <iframe height=498 width=510 src='https://player.youku.com/embed/XNTkwNDUxNTQ4MA==' frameborder=0 'allowfullscreen'></iframe>
      find: /^\s*https?:\/\/v\.youku\.com\/v_show\/id_([\w=]+)\.html.*?$/gm,
      replace: 'https://player.youku.com/embed/$1',
    },
    sohu: {
      // https://tv.sohu.com/v/cGwvOTc3MDY0Mi8zODc1ODA0MjMuc2h0bWw=.html
      find: /^\s*https?:\/\/tv\.sohu\.com\/v\/([\w=]+)\.html.*?$/gm,
      // <iframe frameborder="0" src="https://tv.sohu.com/s/sohuplayer/iplay.html?bid=387588495&autoplay=true&disablePlaylist=true" allowFullScreen="true" scrolling="no"></iframe>
      replace: (match: string, p1: string) => {
        const url = atob(p1);
        const m = url.match(/(\d+)\.shtml/);
        let id = '';
        if (m) {
          // eslint-disable-next-line prefer-destructuring
          id = m[1];
        }
        return `https://tv.sohu.com/s/sohuplayer/iplay.html?bid=${id}&autoplay=false&disablePlaylist=true`;
      },
    },
  };

  _.each(config, (item, id) => {
    text = text.replace(item.find, (match: string, p1: string) => {
      let { replace } = item;
      if (_.isFunction(replace)) {
        replace = replace(match, p1);
      } else {
        replace = replace.replace('$1', p1);
      }
      return `<iframe
          src='${replace}'
          allowfullscreen
        ></iframe>`;
    });
  });
  return text;
}

const useModule = function useModule<T>(): ModuleDefinition {
  const mod: ModuleDefinition = {
    classAttributes: {
      marked,
    },
    classMethods: {
      sanitizeHtml(html: string): string {
        return sanitizeHtml(html, {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat([
            'img',
            'iframe',
          ]),
          allowedIframeHostnames: [
            'www.youtube.com',
            'v.qq.com',
            'liveshare.huya.com',
            'player.youku.com',
            'tv.sohu.com',
          ],
          allowedAttributes: {
            iframe: [
              'src',
              'width',
              'height',
              'frameborder',
              'allowfullscreen',
            ],
          },
        });
      },
      parseEmoji(text: string): string {
        if (!text) {
          return '';
        }
        _.each(emojiJson, (emoji, symbol) => {
          text = text.replace(`:${symbol}:`, emoji);
        });
        return text;
      },
      parseMarkdown(text: string): string {
        return this.sanitizeHtml(
          marked.parse(this.parseEmoji(parseVideos(text)))
        );
        // http://ckang1229.gitee.io/vue-markdown-editor/zh/
        // return this.sanitizeHtml(VueMarkdownEditor.themeConfig.markdownParser.render(this.parseEmoji(text)))
      },
      parseVideos,
      moment(arg: MomentInput): Moment {
        return moment(arg);
      },
    },
  };
  return mod;
};

export default useModule;
