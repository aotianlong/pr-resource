# PigrocksResource

## 简介

PigrocksResource是一个基于typescript的Graphql资源映射, 可以让开发者省却编写gql
你可以想象成它是一个基于Graphql的ORM

## 安装

```bash
npm install pigrocks-resource
```

## 使用

使用之前，需要配置

```ts
import apollo from 'your-apollo-client';
import schema from 'your-graphql-schema-file';
import i18n from 'you-i18n-file';
import { config } from 'pigrocks-resource';

config.apollo = apollo;
config.schema = schema;
config.i18n = i18n;

// 这样就配置好了。
```

创建一个Post的resource

user.ts

```ts
import { createResource } from 'pigrocks-resource';
export default createResource({
  name: 'Post',
});
```

然后我们可以在需要vue文件里这么使用

```ts
import Post from 'post';

Post.className   // 'Post'
Post.objectName  // 'post'
Post.objectsName // 'posts'
Post.columns     // ['title', 'body', 'createdAt', 'updatedAt']
Post.toStore()   // 返回一个Pinia的store
Post.attrName('title')    // 根据i18n的设置，返回一个名称, 这里会返回 '标题'

// 创建一个post
const post = new Post();
post.title = "your post title"
post.tagList = ['tag1', 'tag2', 'tag3', 'tag4'];
post.save().then((newPost) => {
  // 创建成功，从服务器端获得了一个新的post
  newPost.title // 'your post title'
  newPost.id    // 'apostidfromserver'
}).catch((errors) => {
  console.log(errors);
})

// 修改一个post
post.title = ''
post.save()
post.errors // {title: 'title can not be blank'}
// 可以用于表单状态的显示
post.toFormStatus() // {title: {status: 'error', message: 'title an not be blank'}, body: {status: 'success'}}
```
