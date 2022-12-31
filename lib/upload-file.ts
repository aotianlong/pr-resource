import gql from 'graphql-tag';
import _ from 'lodash';
import { FileChecksum } from '@rails/activestorage/src/file_checksum';
import axios, { Cancel, CancelTokenSource } from 'axios';
import config from './config';

type UploadFileOptions = {
  onProgress?: (progress: number) => void;
  cancelToken?: CancelTokenSource;
  url?: string;
};

const { apollo } = config;

const readFile = function readFile(
  file: File
): Promise<ArrayBuffer | null | string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    return reader.result;
  });
};

const uploadFileByFetch = function uploadFileByFetch(
  file: File,
  options: UploadFileOptions = {}
): Promise<any> {
  // 使用axios上传一个文件到/upload/files
  console.log('upload file by fetch', file, options);
  const form = new FormData();
  form.append('file', file);
  return axios.post(
    options.url || '/files/upload',
    form,
    {
      // onUploadProgress: options.onProgress,
      cancelToken: options.cancelToken?.token,
    }
  );
};

const uploadFileByChecksum = function uploadFileByChecksum(
  file: File
): Promise<any> {
  // 首先检查是否已经存在此文件，有，则直接返回blob对象
  // 这样可以省却很多上传
  return new Promise((resolve, reject) => {
    const fileChecksum = new FileChecksum(file);
    fileChecksum.create((error, checksum) => {
      if (error) {
        reject(error);
      } else {
        console.log('file checksum', checksum);
        const query = {
          query: gql`
            query findBlob($checksum: String!) {
              blob(checksum: $checksum) {
                id
                url
                contentType
                signedId
                filename
                byteSize
              }
            }
          `,
          variables: {
            checksum,
          },
        };
        apollo
          .query(query)
          .then((result) => {
            const { blob } = result.data;
            console.log('blob', blob);
            if (blob) {
              resolve(blob);
            } else {
              reject(blob);
            }
          })
          .catch((e) => reject(e));
      }
    });
  });
};

const uploadFile = function uploadFile(
  file: File,
  options: UploadFileOptions = {}
): Promise<any> {
  return new Promise((resolve, reject) => {
    uploadFileByChecksum(file)
      .then((blob) => {
        console.log('upload by checksum ok', blob);
        resolve(blob);
      })
      .catch((e) => {
        // 使用http上传
        // uploadFileByHttp(file)
        uploadFileByFetch(file, options)
          .then((blob) => {
            resolve(blob);
          })
          .catch((ee) => {
            reject(ee);
          });
      });
  });
};

// 上传文件
// 返回一个promise
const uploadFileByHttp = function uploadFileByHttp(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const query = gql`
      mutation createBlob($attributes: BlobAttributes!) {
        createBlob(attributes: $attributes) {
          errors
          blob {
            id
            url
            contentType
            signedId
            filename
            byteSize
          }
        }
      }
    `;
    const result = apollo.mutate({
      mutation: query,
      variables: {
        attributes: {
          blob: file,
        },
      },
    });

    result
      .then((response: any) => {
        const { errors, blob } = response.data.createBlob;
        const error = _.values(errors)[0];
        if (error) {
          // file.error = error;
          reject(error);
        } else {
          resolve(blob);
        }
      })
      .catch((e) => {
        reject(e);
      });
  });
};

export { uploadFile, readFile, uploadFileByChecksum, uploadFileByHttp };

export default uploadFile;
