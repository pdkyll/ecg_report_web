import Vue from "vue";
import Router from "vue-router";
import Home from "@/components/Home";

import UserChangePwd from "@/components/user/changepwd";
import UserProfile from "@/components/user/profile";

import DoctorPatientList from "@/components/doctor/patientList";
import {bus} from './bus';
import Util from './common/util';
// 懒加载方式，当路由被访问的时候才加载对应组件
const Login = resolve => require(['@/components/Login'], resolve)
const independentAuditor = resolve => require(['@/components/independentAuditor/independentAuditor'], resolve)
const independentAuditorReal = resolve => require(['@/components/independentAuditor/independentAuditorReal'], resolve)

Vue.use(Router);

let router = new Router({
    routes: [
        {
            path: '/',
            redirect:{
                name:'登录'
            }
        },
        {
            path: '/login',
            name: '登录',
            component: Login
        },
        {
            path: '/independentAuditor',
            name: '空白页',
            component: independentAuditor
        },
        {
            path: '/independentAuditorReal',
            name: '独立审核',
            component: independentAuditorReal
        },
        {
            path: '/superAdmin',
            component: Home,
            name: '超级管理员',
            menuShow: true,
            leaf: true, // 只有一个节点
            iconCls: 'iconfont icon-users', // 图标样式class
            children: [
                {
                    path: '/superAdmin/patientList',
                    name: 'superPatientList',
                    component: () => import('./components/superAdmin/patientList.vue')
                },
                {
                    path: '/superAdmin/agentManage',
                    name: 'superAgentManage',
                    component: () => import('./components/superAdmin/AgentManage.vue')
                },
                {
                    path: '/superAdmin/systemMessage',
                    name: 'superSystemMessage',
                    component: () => import('./components/systemMessage/SystemMessage.vue')
                },
                {
                    path: '/superAdmin/doctorManage',
                    component: () => import('./components/admin/DoctorManage.vue'),
                    name: 'superDoctorManage',
                    menuShow: true
                },
                {
                    path: '/superAdmin/statisticalAnalysis',
                    component: () => import('./components/superAdmin/statisticalAnalysis.vue'),
                    name: '统计分析',
                    menuShow: true
                },
                {
                    path: '/superAdmin/systemLog',
                    component: () => import('./components/systemLog/systemLog.vue'),
                    name: '系统日志',
                    menuShow: true
                }
            ],
            beforeEnter: (to, from, next) => {
                let accessUser = JSON.parse(localStorage.getItem('access-user'));
                if (accessUser.userType === 4) {
                    next();
                } else {
                    next(from.path);
                }
            }
        },
        {
            path: '/admin',
            component: Home,
            name: '管理员界面',
            menuShow: true,
            leaf: true, // 只有一个节点
            iconCls: 'iconfont icon-users', // 图标样式class
            children: [
                {
                    path: '/admin/patientList',
                    component: () => import('./components/admin/patientList.vue'),
                    name: '病人列表',
                    menuShow: true
                },
                {
                    path: '/admin/institutionConfig',
                    component: () => import('./components/superAdmin/AgentManage.vue'),
                    name: '医院管理',
                    menuShow: true
                },
                {
                    path: '/admin/doctorList',
                    component: () => import('./components/admin/doctorList.vue'),
                    name: '标注医生列表',
                    menuShow: true
                },
                {
                    path: '/admin/auditorList',
                    component: () => import('./components/admin/auditorList.vue'),
                    name: '审核医生列表',
                    menuShow: true
                },
                {
                    path: '/admin/dataList',
                    component: () => import('./components/admin/dataList.vue'),
                    name: '上传医生列表',
                    menuShow: true
                },
                {
                    path: '/admin/doctorManage',
                    component: () => import('./components/admin/DoctorManage.vue'),
                    name: '医生管理',
                    menuShow: true
                },
                {
                    path: '/admin/statisticalAnalysis',
                    component: () => import('./components/superAdmin/statisticalAnalysis.vue'),
                    name: '统计分析',
                    menuShow: true
                }
            ],
            beforeEnter: (to, from, next) => {
                let accessUser = JSON.parse(localStorage.getItem('access-user'));
                if (accessUser.userType === 2) {
                    next();
                } else {
                    next(from.path);
                }
            }
        },
        {
            path: '/doctor',
            component: Home,
            name: '标注医生界面',
            menuShow: true,
            leaf: true, // 只有一个节点
            iconCls: 'iconfont icon-users', // 图标样式class
            children: [
                {path: '/doctor/patientList', component: DoctorPatientList, name: '医生-病人列表', menuShow: true},
                {
                    path: 'ecgView',
                    component: () => import('./views/EcgView.vue'),
                    name: '医生-病人详情',
                    menuShow: true,
                    beforeRouteLeave(to, from, next) {
                        // 导航离开该组件的对应路由时调用
                        // 可以访问组件实例 `this`
                    }
                },
                {
                    path: '/doctor/ecgReport',
                    component: () => import('./views/EcgReport.vue'),
                    name: '医生-病人报告',
                    menuShow: true
                },
                {
                    path: '/doctor/task',
                    component: () => import('./views/Task.vue'),
                    name: '医生-任务列表',
                    menuShow: true
                },
                {
                    path: '/doctor/tagging',
                    component: () => import('./views/EcgTagging.vue'),
                    name: '医生-标注系统',
                    menuShow: true
                }
            ],
            beforeEnter: (to, from, next) => {
                let accessUser = JSON.parse(localStorage.getItem('access-user'));
                if (accessUser.userType === 0 || accessUser.userType === 1 || accessUser.userType === 3 || accessUser.userType === 2 || accessUser.userType === 4) {
                    next();
                } else {
                    next(from.path);
                }
            },
        },
        {
            path: '/uploader',
            component: Home,
            name: '上传医生界面',
            menuShow: true,
            leaf: true, // 只有一个节点
            iconCls: 'iconfont icon-users', // 图标样式class
            children: [
                {
                    path: '/uploader/patientList',
                    component: () => import('./components/uploader/patientList.vue'),
                    name: '上传医生报告列表',
                    menuShow: true
                }
            ],
            beforeEnter: (to, from, next) => {
                let accessUser = JSON.parse(localStorage.getItem('access-user'));
                if (accessUser.userType === 1) {
                    next();
                } else {
                    next(from.path);
                }
            }
        },
        {
            path: '/auditor',
            component: Home,
            name: '审核医生界面',
            menuShow: true,
            leaf: true, // 只有一个节点
            iconCls: 'iconfont icon-users', // 图标样式class
            children: [
                {
                    path: '/auditor/patientList',
                    component: () => import('./components/auditor/patientList.vue'),
                    name: '审核医生报告列表',
                    menuShow: true
                }
            ],
            beforeEnter: (to, from, next) => {
                let accessUser = JSON.parse(localStorage.getItem('access-user'));
                if (accessUser.userType === 3) {
                    next();
                } else {
                    next(from.path);
                }
            }
        },
        {
            path: '/user',
            component: Home,
            name: '设置',
            menuShow: true,
            iconCls: 'iconfont icon-setting1',
            children: [
                {path: '/user/profile', component: UserProfile, name: '个人信息', menuShow: true},
                {path: '/user/changepwd', component: UserChangePwd, name: '修改密码', menuShow: true}
            ]
        }
    ]
})

router.beforeEach((to, from, next) => {
    // console.log('to:' + to.path)
    if (to.path.startsWith('/login')) {
        window.localStorage.removeItem('access-user')
        next()
    } else {
        if (to.path === '/independentAuditor' || to.path === '/independentAuditorReal') {
            next()
        } else {
            let user = JSON.parse(window.localStorage.getItem('access-user'))
            if (!user) {
                next({path: '/login'})
            } else {
                next()
            }
        }
    }
});

export default router
