<template>
    <div>
        <el-form ref="AccountFrom" :model="account" :rules="rules" label-position="left" label-width="0px"
                 class="demo-ruleForm login-container" v-loading="loadPage">
            <img src="../assets/logo.png"
                 style="width: 80px;height: 80px;position: relative;left: 50%;margin-left: -40px;margin-bottom: 15px">
            <h3 class="title">亿心康远程心电会诊中心</h3>
            <el-form-item prop="username">
                <el-input type="text" v-model="account.username" auto-complete="off" placeholder="账号"
                          @keyup.enter.native="handleLogin"></el-input>
            </el-form-item>
            <el-form-item prop="pwd">
                <el-input type="password" v-model="account.pwd" auto-complete="off" placeholder="密码"
                          @keyup.enter.native="handleLogin"></el-input>
            </el-form-item>
            <!--<el-checkbox v-model="checked" checked class="remember">记住密码</el-checkbox>-->
            <el-form-item style="width:100%;">
                <el-button type="primary" style="width:100%;" @click.native.prevent="handleLogin" :loading="loading">登录
                </el-button>
            </el-form-item>
        </el-form>
        <div style="position: absolute;bottom: 0;width: 100%" v-if="isIEState">
            <el-alert
                    title="温馨提示"
                    type="warning"
                    show-icon
                    center
            >
                IE内核的浏览器会导致系统功能异常，
                强烈推荐使用<a href="https://www.google.cn/chrome/" class="download-text" target="_blank">Chrome</a>
                或者<a href="http://www.firefox.com.cn/"
                     target="_blank"
                     class="download-text"
            >Firefox</a>浏览器来获得最佳的操作体验！
            </el-alert>
        </div>
    </div>
</template>

<script>
    import API from "../api/api_user";
    import Util from '../common/util';

    export default {
        data() {
            return {
                loadPage: false,
                loading: false,
                title: '',
                logo: '',
                account: {
                    username: "",
                    pwd: ""
                },
                rules: {
                    username: [
                        {required: true, message: "请输入账号", trigger: "blur"}
                        //{ validator: validaePass }
                    ],
                    pwd: [
                        {required: true, message: "请输入密码", trigger: "blur"}
                        //{ validator: validaePass2 }
                    ]
                },
                checked: true
            };
        },
        computed: {
            isIEState: function () {
                return Util.IEVersion() !== '';
            }
        },
        mounted() {
            localStorage.clear();
//            this.getLogoAndTitle();
        },
        methods: {
            getLogoAndTitle() {
                API.getTitleAndLogo()
                    .then(data => {
                        this.loadPage = false;
                        localStorage.setItem('title', data.hospital);
                        localStorage.setItem('logo', 'data:image/jpg;base64,' + data.data);
                        this.title = data.hospital;
                        this.logo = 'data:image/jpg;base64,' + data.data;
                    }).catch(() => {
                    this.loadPage = false;
                });
            },
            handleLogin() {
                let that = this;
                this.$refs.AccountFrom.validate(valid => {
                    if (valid) {
                        this.loading = true;
                        let sha256 = require("js-sha256").sha256; //这里用的是require方法，所以没用import
                        let loginParams = {
                            username: this.account.username,
                            password: sha256(this.account.pwd)
                        };
                        API.login(loginParams)
                            .then(
                                function (result) {
                                    that.loading = false;
                                    that.loading = false;
                                    let data = result.data;
                                    result = data;
                                    localStorage.setItem('preName', result.pre_name);
                                    result.id = result.user_id;
                                    result.nickname = result.nick_name;
                                    result.username = loginParams.username;
                                    result.userType = Util.userType[result.role];
                                    localStorage.setItem('title', data.hospital);
                                    localStorage.setItem('logo', 'data:image/jpg;base64,' + data.data);
                                    that.title = data.hospital;
                                    that.logo = 'data:image/jpg;base64,' + data.data;
                                    localStorage.setItem("access-user", JSON.stringify(result));
                                    switch (result.userType){
                                        case 0:that.$router.push({path: "/doctor/patientList"});break;
                                        case 1:that.$router.push({path: "/uploader/patientList"});break;
                                        case 2:that.$router.push({path: "/admin/patientList"});break;
                                        case 3:that.$router.push({path: "/auditor/patientList"});break;
                                        case 4:that.$router.push({path: "/superAdmin/patientList"});break;
                                    }
                                }
                            ).catch(() => {
                            this.loading = false;
                        })
                    }
                });
            }
        }
    };
</script>
<style>
    body {
        background: #dfe9fb;
    }
</style>
<style lang="scss" scoped>
    .login-container {
        /*box-shadow: 0 0px 8px 0 rgba(0, 0, 0, 0.06), 0 1px 0px 0 rgba(0, 0, 0, 0.02);*/
        -webkit-border-radius: 5px;
        border-radius: 5px;
        -moz-border-radius: 5px;
        background-clip: padding-box;
        margin: 160px auto;
        width: 350px;
        padding: 35px 35px 15px 35px;
        background: #fff;
        border: 1px solid #eaeaea;
        box-shadow: 0 0 25px #cac6c6;

        background: -ms-linear-gradient(top, #ace, #00c1de); /* IE 10 */
        background: -moz-linear-gradient(top, #ace, #00c1de); /*火狐*/
        background: -webkit-gradient(
                        linear,
                        0% 0%,
                        0% 100%,
                        from(#ace),
                        to(#00c1de)
        ); /*谷歌*/
        background: -webkit-linear-gradient(
                        top,
                        #ace,
                        #00c1de
        ); /*Safari5.1 Chrome 10+*/
        background: -o-linear-gradient(top, #ace, #00c1de); /* Opera 11.10+ */
        .title {
            margin: 0px auto 20px auto;
            text-align: center;
            font-size: 20px;
            color: #409eff;
        }
        .remember {
            margin: 0px 0px 35px 0px;
        }
    }

    .download-text {
        color: #d03934;
        font-weight: bold;
        margin-left: 10px;
        margin-right: 10px;
    }
</style>
