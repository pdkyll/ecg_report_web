<template>
    <el-row class="container">
        <!--头部-->
        <el-col :span="24" class="topbar-wrap" v-if="hackReset">
            <div class="topbar-logo topbar-btn">
                <a><img :src="logo" style="padding-left:8px;width: 40px"></a>
            </div>
            <div class="topbar-logos" v-show="!collapsed">
                <a>
                    <div style="height:50px;">
                        <span style="color:#ff9d00;line-height:50px;font-size:20px;">{{title}}·远程心电会诊中心</span>
                    </div>
                    <!-- <img src="../assets/logotxt.png"> -->
                </a>
            </div>

            <!-- <div id="title-bar">
                <span>医生列表</span>
                <span>病人列表</span>
                <span>数据管理员列表</span>
            </div> -->

            <el-menu
                    :default-active="defaultActiveIndex"
                    class="el-menu-demo"
                    mode="horizontal"
                    @select="handleSelect"
                    background-color="#373d41"
                    text-color="#fff"
                    active-text-color="#ffd04b"
                    router
                    v-if="hackResetList"
                    style="float:left;margin-left:58px;padding-top:3px;">
                <el-menu-item v-if="userType == 2" index="0" :route="{path: '/admin/patientList'}">报告列表</el-menu-item>
                <el-menu-item v-if="userType == 2" index="1" :route="{path: '/admin/doctorManage'}">
                    医生管理
                </el-menu-item>
                <el-menu-item v-if="userType == 2" index="2" :route="{path: '/admin/institutionConfig'}">
                    医院管理
                </el-menu-item>
                <el-menu-item v-if="userType == 0" index="0" :route="{path: '/doctor/patientList'}">报告列表</el-menu-item>
                <el-menu-item v-if="userType == 3" index="0" :route="{path: '/auditor/patientList'}">报告列表</el-menu-item>
                <el-menu-item v-if="userType == 1" index="0" :route="{path: '/uploader/patientList'}">上传数据列表
                </el-menu-item>
                <el-menu-item v-if="userType == 4" index="0" :route="{path: '/superAdmin/patientList'}">报告列表
                </el-menu-item>
                <el-menu-item v-if="userType == 4" index="1" :route="{path: '/superAdmin/agentManage'}">医院管理
                </el-menu-item>
                <el-menu-item v-if="userType == 4" index="2" :route="{path: '/superAdmin/systemMessage'}">系统通知
                </el-menu-item>
                <el-menu-item v-if="userType == 4" index="3" :route="{path: '/superAdmin/doctorManage'}">
                    医生管理
                </el-menu-item>
                <el-menu-item v-if="userType == 4" index="4" :route="{path: '/superAdmin/statisticalAnalysis'}">
                    统计分析
                </el-menu-item>
                <el-menu-item v-if="userType == 2" index="3" :route="{path: '/admin/statisticalAnalysis'}">
                    统计分析
                </el-menu-item>
                <el-menu-item v-if="userType == 4" index="5" :route="{path: '/superAdmin/systemLog'}">
                    统计日志
                </el-menu-item>
            </el-menu>
            <div class="topbar-account topbar-btn" style="float:right;">
                <el-dropdown trigger="click">
          <span class="el-dropdown-link userinfo-inner"><i class="iconfont icon-user"></i> {{nickname}}  <i
                  class="iconfont icon-down"></i></span>
                    <el-dropdown-menu slot="dropdown">
                        <el-dropdown-item>
                            <div @click="jumpTo('/user/profile')"><span style="color: #555;font-size: 14px;">个人信息</span>
                            </div>
                        </el-dropdown-item>
                        <el-dropdown-item>
                            <div @click="jumpTo('/user/changepwd')"><span
                                    style="color: #555;font-size: 14px;">修改密码</span></div>
                        </el-dropdown-item>
                        <el-dropdown-item divided @click.native="logout">退出登录</el-dropdown-item>
                    </el-dropdown-menu>
                </el-dropdown>
            </div>
            <div class="online_num" v-if="userType == 4" index="3" @click="jumpTo('/superAdmin/doctorManage', '3')">
                在线人数：{{doctorOnlineCount}}
            </div>
            <div class="online_num" v-if="userType == 2" index="1" @click="jumpTo('/admin/doctorManage', '1')">
                在线人数：{{doctorOnlineCount}}
            </div>
        </el-col>
        <!--中间-->
        <el-col :span="24" class="main">

            <!--右侧内容区-->
            <section class="content-container">
                <div class="grid-content bg-purple-light">
                    <el-col :span="24" class="content-wrapper">
                        <transition name="fade" mode="out-in">
                            <router-view></router-view>
                        </transition>
                    </el-col>
                </div>
            </section>
        </el-col>
    </el-row>
</template>

<script>
    import {bus} from "../bus.js";
    import API from "../api/api_user";
    import Util from "../common/util";
    import AiWebsocket from '../components/AiWebsocket';
    import APISuperAdmin from '../api/api_super_admin';
    import {mapState, mapMutations} from 'vuex';

    export default {
        name: "home",
        mixins: [AiWebsocket],
        beforeCreate() {
            let user = localStorage.getItem("access-user");
            let path = this.$route.path;
            if (!/\/doctor\/ecgView/g.test(path)) {
                if (JSON.parse(user).userType === 2) {
                    this.$router.push('/admin/patientList');//页面刷新后重置路由
                }
                if (JSON.parse(user).userType === 4) {
                    this.$router.push('/superAdmin/patientList');//页面刷新后重置路由
                }
            }
        },
        created() {
            bus.$on("setNickName", text => {
                this.nickname = text;
            });
            let user = JSON.parse(localStorage.getItem("access-user"));
            this.userType = user.userType;
            bus.$on("goto", url => {
                if (url === "/login") {
                    localStorage.removeItem("access-user");
                }
                this.$router.push(url);
            });
            if (this.userType === 2 || this.userType === 4) {
                this.doctorOnlineCount = '正在加载中...'
                API.getDoctorOnlineCount({}).then((data) => {
                    this.doctorOnlineCount = data.length + '人'
                }).catch(() => {
                    this.doctorOnlineCount = '加载人数失败，请刷新重新加载...'
                })
            }
        },
        data() {
            return {
                doctorOnlineCount: 0,
                defaultActiveIndex: "0",
                nickname: "",
                collapsed: false,
                userType: 0,
                hackReset: true,
                instance: null,
                hackResetList: true
            };
        },
        methods: {
            ...mapMutations('homeLogoAndTitle',
                [
                    'setLogo',
                    'setTitle'
                ]
            ),
            toDoctorManage() {
                if (this.userType === 3) {

                }
            },
            handleSelect(index) {
                this.defaultActiveIndex = index;
            },
            //折叠导航栏
            collapse: function () {
                this.collapsed = !this.collapsed;
            },
            jumpTo(url, index = -1) {
                if (index !== -1) {
                    this.defaultActiveIndex = index;
                } else {
                    this.defaultActiveIndex = url;
                }
                this.$router.push(url); //用go刷新
            },
            logout() {
                let that = this;
                this.$confirm("确认退出吗?", "提示", {
                    confirmButtonClass: "el-button--warning"
                })
                    .then(() => {
                        //确认
                        that.loading = true;
                        API.logout()
                            .then(
                                function (result) {
                                    that.loading = false;
                                    localStorage.removeItem("access-user");
                                    localStorage.clear();
                                    that.$router.go("/login"); //用go刷新
                                },
                                function (err) {
                                    that.loading = false;
                                    that.$message.error({
                                        showClose: true,
                                        message: err.toString(),
                                        duration: 2000
                                    });
                                }
                            )
                            .catch(function (error) {
                                that.loading = false;
                                that.$message.error({
                                    showClose: true,
                                    message: "请求出现异常",
                                    duration: 2000
                                });
                            });
                    })
                    .catch(() => {
                    });
            },
            closeNotification() {
                APISuperAdmin.confirmNoticication({}).then((data) => {
                });
            },
            changeSelectIndex(index) {
                this.defaultActiveIndex = index;
                this.hackReset = false;
                this.$nextTick(() => {
                    this.hackReset = true
                })
            },
            getNotification() {
                APISuperAdmin.getRecentNotication({}).then(data => {
                    if (this.instance !== null) this.instance.close();
                    if (data.length) {
                        this.instance = this.$notify({
                            title: data[0].title,
                            type: 'info',
                            message: data[0].content,
                            duration: 0,
                            onClose: this.closeNotification
                        });
                    }
                });
            }
        },
        computed: {
            ...mapState('homeLogoAndTitle', {
                logo: state => state.logo,
                title: state => state.title
            })
        },
        watch: {
            logo: function () {
                this.hackReset = false;
                this.$nextTick(() => {
                    this.hackReset = true;
                })
            },
            title: function () {
                this.hackReset = false;
                this.$nextTick(() => {
                    this.hackReset = true;
                })
            }
        },
        mounted() {
            this.setLogo(localStorage.getItem('logo'));
            this.setTitle(localStorage.getItem('title'));
            let user = localStorage.getItem("access-user");
            if (user) {
                user = JSON.parse(user);
                this.nickname = user.nickname || "";
            }
            this.initWebsocket();
            this.getNotification();
            bus.$off('sendNotification');
            bus.$on('sendNotification', () => {
                this.getNotification();
            });
            bus.$off('changeSelectIndex');
            bus.$on('changeSelectIndex', this.changeSelectIndex);
            this.hackReset = false;
            this.$nextTick(() => {
                this.hackReset = true;
            });
        }
    };
</script>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
    .container {
        position: absolute;
        top: 0px;
        bottom: 0px;
        width: 100%;
        .bg-purple-light {
            height: 100%;
            width: 100%;
        }
        .online_num {
            float: right;
            color: #ffffff;
            cursor: pointer;
            font-size: 14px;
            margin-right: 20px;
        }

        #title-bar span {
            color: white;
            margin-left: 100px;
            background-color: blue;
        }

        .topbar-wrap {
            height: 50px;
            line-height: 50px;
            background: #373d41;
            padding: 0px;

            .topbar-btn {
                color: #fff;
            }

            /*.topbar-btn:hover {*/
            /*background-color: #4A5064;*/
            /*}*/
            .topbar-logo {
                float: left;
                width: 59px;
                line-height: 26px;
            }

            .topbar-logos {
                float: left;
                /*width: 120px;*/
                line-height: 26px;
            }

            .topbar-logo img,
            .topbar-logos img {
                height: 40px;
                margin-top: 5px;
                margin-left: 2px;
            }

            .topbar-title {
                float: left;
                text-align: left;
                width: 200px;
                padding-left: 10px;
                border-left: 1px solid #000;
            }

            .topbar-account {
                float: right;
                padding-right: 12px;
            }

            .userinfo-inner {
                cursor: pointer;
                color: #fff;
                padding-left: 10px;
            }
        }

        .main {
            display: -webkit-box;
            display: -webkit-flex;
            display: -ms-flexbox;
            display: flex;
            position: absolute;
            top: 50px;
            bottom: 0px;
            /*overflow: hidden;*/
        }

        aside {
            min-width: 50px;
            background: #333744;

            &::-webkit-scrollbar {
                display: none;
            }

            &.showSidebar {
                overflow-x: hidden;
                overflow-y: auto;
            }

            .el-menu {
                height: 100%; /*写给不支持calc()的浏览器*/
                height: -moz-calc(100% - 80px);
                height: -webkit-calc(100% - 80px);
                height: calc(100% - 80px);
                border-radius: 0px;
                background-color: #333744;
                border-right: 0px;
            }

            .el-submenu .el-menu-item {
                min-width: 60px;
            }

            .el-menu {
                width: 180px;
            }

            .el-menu--collapse {
                width: 60px;
            }

            .el-menu .el-menu-item,
            .el-submenu .el-submenu__title {
                height: 46px;
                line-height: 46px;

                span {
                    color: white;
                }
            }

            .el-menu-item:hover,
            .el-submenu .el-menu-item:hover,
            .el-submenu__title:hover {
                background-color: #7ed2df;
            }
        }

        .menu-toggle {
            background: #4a5064;
            text-align: center;
            color: white;
            height: 26px;
            line-height: 30px;
        }

        .content-container {
            background: #fff;
            flex: 1;
            /*overflow: auto;*/
            /*padding: 10px;*/
            padding-bottom: 1px;

            .content-wrapper {
                background-color: #fff;
                box-sizing: border-box;
                height: 100%;
                width: 100%;
                overflow: auto;
                /*padding: 10px;*/
                /*min-height: 800px;*/
                /*border-radius: 4px;*/
                /*box-shadow: 0 1px 17px 1px rgba(0,0,0, .3);*/
            }
        }
    }
</style>
