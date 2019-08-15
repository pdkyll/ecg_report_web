<template>
    <div class="wrapper infinite-list" :infinite-scroll-immediate="false" v-infinite-scroll="load">
        <div class="query-item">
            <query-item :queryItems="queryItems" :isEmitByButton="true" @handleReturnData="handleQuery">
            </query-item>
        </div>
        <InitialList :logsData="logsData" ref="initialList"/>
    </div>
</template>
<script type="text/ecmascript-6">
    import Util from '../../common/util'
    import userAPI from "../../api/api_user";
    import  QueryItem from '../common/QueryItem.vue';
    import InitialList from './InitialList';
    export default {
        components: {
            QueryItem,
            InitialList
        },
        data() {
            return {
                logsData: {},
                queryItems: [
                    {
                        type: 'date',
                        model: {
                            key: 'date',
                            value: [Util.formatDate.format(new Date(),  'yy/MM/dd'), Util.formatDate.format(new Date(),  'yy/MM/dd')]
                        },
                        options: {
                            shortcuts: [
                                {
                                    text: '今日',
                                    onClick(picker) {
                                        let now = new Date();
                                        let end = new Date(now.getFullYear() + '/' + (now.getMonth() + 1) + '/' + now.getDate() + ' 23:59:00');
                                        let start = new Date(now.getFullYear() + '/' + (now.getMonth() + 1) + '/' + now.getDate() + ' 00:00:00');
                                        picker.$emit('pick', [start, end]);
                                    }
                                },
                                {
                                    text: '昨天',
                                    onClick(picker) {
                                        let day = new Date().getTime()-24*60*60*1000
                                        picker.$emit('pick', Util.calcShortCuts(0, day));
                                    }
                                }, {
                                    text: '本周',
                                    onClick(picker) {
                                        let now = new Date();
                                        let nowDayOfWeek = now.getDay()
                                        picker.$emit('pick', Util.calcShortCuts(nowDayOfWeek - 1));
                                    }
                                }, {
                                    text: '上周',
                                    onClick(picker) {
                                        let now = new Date();
                                        let day = now.getTime()-24*60*60*1000*now.getDay()
                                        picker.$emit('pick', Util.calcShortCuts(6,day));
                                    }
                                }]
                        }
                    },
                    {
                        type: 'tree',
                        placeholder: '全部医院',
                        model: {
                            key: 'institutionId',
                            value: ''
                        },
                        label: '所属医院:',
                        data: () => {
                            return new Promise((resolve, reject) => {
                                userAPI.getInstitutions({
                                    showReportCount: false
                                }).then(res => {
                                    resolve(res);
                                })
                            });
                        },
                        childKey: ['userType', 'username']
                    },
                    {
                        type: 'select',
                        model: {key: 'userType', value: ''},
                        loadNow: true, // 是否在初始化里面数据的时候就加载选择数据
                        data: () => {
                            return new Promise((resolve, reject) => {
                                let roleData = [
                                    {label: '全部角色', value: ''},
                                    {label: '上传医生', value: 'ROLE_UPLOADER'},
                                    {label: '标注医生', value: 'ROLE_EDITOR'},
                                    {label: '审核医生', value: 'ROLE_AUDITOR'},
                                    {label: '数据管理员', value: 'ROLE_ADMINISTRATOR'},
                                ]
                                if (JSON.parse(localStorage.getItem('access-user')).userType === 4) {
                                    roleData = [...roleData, {label: '超级管理员', value: 'ROLE_SUPER_ADMINISTRATOR'}]
                                }
                                resolve(roleData);
                            });
                        },
                        childKey: ['username']
                    },
                    {
                        type: 'select',
                        model: {key: 'username', value: ''},
                        filterable: true,
                        remote: true,
                        clearable: false,
                        remoteMethod(val) {
                            let param = {institutionId: val.institutionId.id, userType: val.userType, keyword: val.query}
                            return new Promise((resolve, reject) => {
                                userAPI.getUsersByRole(param).then(res => {
                                    let arr = res.map((v) => {
                                        return {label: v.login_name, value: v.login_name}
                                    })
                                    resolve(arr);
                                })
                            });
                        },
                        data: (val) => {
                            let param = {institutionId: val.institutionId.id, userType: val.userType, keyword: ''}
                            return new Promise((resolve, reject) => {
                                userAPI.getUsersByRole(param).then(res => {
                                    let arr = res.map((v) => {
                                        return {label: v.login_name, value: v.login_name}
                                    })
                                    resolve(arr);
                                })
                            });
                        },
                        parentKey: ['userType', 'institutionId']
                    },
                    {
                        type: 'select',
                        model: {key: 'category', value: ''},
                        data: [
                            {value: '',label: '全部'},
                            {value: 'USER',label: '个人操作'},
                            {value: 'REPORT',label: '报告操作'},
                            {value: 'INSTITUTION',label: '医院操作'},
                            {value: 'DOCTOR',label: '医生操作'},
                            {value: 'SYSTEM',label: '系统通知'},
                        ],
                        label:  '操作类别:'
                    },
                    {
                        type: 'input',
                        model: {key: 'keyword', value: ''},
                        label: '操作记录:'
                    },
                    {
                        type: 'actions',
                        actions: [
                            {label: '查询', key: 'search', type: 'primary'},
                            {label: '重置', key: 'reset'}
                        ]
                    }
                ],
            }
        },
        methods: {
            load() {
                // this.$refs.initialList.loadMore();
            },
            handleQuery(val) {
                let param = {}
                for (let key in val) {
                    if (val[key]) {
                        if (key === 'date') {
                            param['startTime'] = val[key][0] + ' 00:00:00'
                            param['endTime'] = val[key][1] + ' 23:59:59'
                        } else if (key === 'institutionId') {
                            param['institutionId'] = val[key].id
                        } else {
                            param[key] = val[key]
                        }
                    }
                }
                userAPI.getLogs(param)
                    .then( data => {
                        let newKey = Object.keys(data).sort((a, b) => {
                           let item1 = Number(a.split('-').join(''));
                           let item2 = Number(b.split('-').join(''));
                           return item2 - item1
                        });
                        let retData = {};
                        newKey.map(item => {
                            retData[item] = data[item];
                        });
                        this.logsData = retData;
                    })
            },
        }
    }
</script>
<style type="text/css" scoped lang="scss">
.query-item {
    margin-top: 20px;
    padding: 0 20px;
}
.wrapper {
    width: 100%;
    /*height: 100%;*/
    margin: auto;
    overflow-y: auto;
}
</style> 