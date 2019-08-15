/**
 * Created by jerry on 2017/6/9.
 */
import axios from "axios";
const qs = require('qs');
import {bus} from "../bus.js";
import router from '../router'
import {MessageBox} from 'element-ui'
axios.defaults.withCredentials = true;
// axios.defaults.headers.common['Authorization'] = AUTH_TOKEN;
axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';//配置请求头
var alertFlag = false // 控制短时间内 多个请求返回‘没有找到该报告’报错信息只弹一次alert框

//添加一个请求拦截器
// axios.interceptors.request.use(function (config) {
//   console.dir(config);
//   return config;
// }, function (error) {
//   // Do something with request error
//   return Promise.reject(error);
// });
// transformRequest: [function (data) {
//     let formData = new URLSearchParams();
//     Object.keys(data).forEach(key => formData.append(key, data[key]));
//     return formData.toString();
// }]

// 添加一个响应拦截器el-date-picker
axios.interceptors.response.use(function (response) {
    if (response.data && response.data.errcode) {
        if (parseInt(response.data.errcode) === 40001) {
            //未登录
            bus.$emit('goto', '/login')
        }
    }
    return response;
}, function (error) {
    // Do something with response error
    if (error.response) {
        if (error.response.status === 401) {
            if (window.location.href.indexOf('independentAuditor') !== -1) {
                MessageBox.alert('登陆状态过期,请重新登陆!', '警告', {
                    confirmButtonText: '确定',
                    type:'warning',
                    showClose: false,
                    closeOnPressEscape: false,
                    closeOnClickModal: false,
                    callback: action => {
                    }
                })
            } else {
                bus.$message.closeAll();
                bus.$message.error('登录失效，请重新登录！');
                bus.$emit('goto', '/login');
            }
        } else {
            if (!alertFlag) {
                alertFlag = true
                if (error.response.data.message === '该报告已经删除!') {
                    MessageBox.alert('该报告已删除', '警告', {
                        confirmButtonText: '确定',
                        type:'warning',
                        showClose: false,
                        closeOnPressEscape: false,
                        closeOnClickModal: false,
                        callback: action => {
                            setTimeout(() => {
                                alertFlag = false
                            }, 1000/60)
                            router.go(-1);
                        }
                    })
                }
            }
            if (error.response.data) {
                let hideMessage = false;
                bus.$off('hideErrorMessage');
                bus.$on('hideErrorMessage', (hideMessageState) => {
                    hideMessage = hideMessageState;
                });
                setTimeout(() => {
                    if (!hideMessage) {
                        bus.$message.closeAll();
                        bus.$message.error(error.response.data.message || '加载出错');
                    }
                }, 0);
            }
            return Promise.reject(error);
        }
    }
});

//基地址
// let base = 'http://127.0.0.1:8000';  //接口代理地址参见：config/index.js中的proxyTable配置
let base = '';  //接口代理地址参见：config/index.js中的proxyTable配置

//通用方法
export const POST = (url, params) => {
    return axios.post(`${base}${url}`, params, {
        transformRequest: [function (data) {
            let formData = new URLSearchParams();
            Object.keys(data).forEach(key => formData.append(key, data[key]));
            return formData;
        }]
    }).then(res => res.data)
}

export const GET = (url, params) => {
    return axios.get(`${base}${url}`, {params: params, paramsSerializer: params => {
        return qs.stringify(params, { indices: false })
    }}).then(res => res?res.data:res)
};

export const PUT = (url, params) => {
    return axios.put(`${base}${url}`, params, {
        transformRequest: [function (data) {
            let formData = new URLSearchParams();
            Object.keys(data).forEach(key => formData.append(key, data[key]));
            return formData;
        }]
    }).then(res => res.data)
}

export const PUT_JSON = (url, params) => {
    return axios.put(`${base}${url}`, params).then(res => res.data)
}

export const DELETE = (url, params) => {
    return axios.delete(`${base}${url}`, {params: params}).then(res => res.data)
}

export const PATCH = (url, params) => {
    return axios.patch(`${base}${url}`, params).then(res => res.data)
}
