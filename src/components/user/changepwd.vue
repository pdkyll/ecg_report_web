.f
<template>
    <el-row class="warp">
        <el-col :span="24" class="warp-breadcrum">
            <el-breadcrumb separator="/">
                <!-- <el-breadcrumb-item><b>首页</b></el-breadcrumb-item>
                <el-breadcrumb-item>设置</el-breadcrumb-item> -->
                <el-breadcrumb-item>修改密码</el-breadcrumb-item>
            </el-breadcrumb>
        </el-col>

        <el-col :span="24" class="warp-main">
            <el-form ref="form" :model="form" label-width="120px" :rules="formRule">
                <el-form-item label="原密码" prop="oldPwd">
                    <el-input v-model="form.oldPwd" type="password"></el-input>
                </el-form-item>
                <el-form-item label="新密码" prop="newPwd">
                    <el-input v-model="form.newPwd" type="password"></el-input>
                </el-form-item>
                <el-form-item label="确认新密码" prop="confirmPwd">
                    <el-input v-model="form.confirmPwd" type="password"></el-input>
                </el-form-item>
                <el-form-item>
                    <el-button type="default" @click="handleChangepwd">提交</el-button>
                </el-form-item>
            </el-form>
        </el-col>
    </el-row>
</template>
<script>
    import API from "../../api/api_user";
    import {bus} from "../../bus.js";
    export default {
        data() {
            let checkISNull = (rule, value, callback) => {
                let regPassword = /^[\w]{6,16}$/i;

                if (!value) {
                    callback(new Error('输入不能为空'))
                } else {
                    if (!regPassword.test(value)) {
                        callback(new Error('密码由6-16位字母或数字组成！'))
                    }
                    if (/\s+/g.test(value)) {
                        callback(new Error('不能输入空格'))
                    } else {
                        callback();
                    }
                }
            };
            return {
                form: {
                    user_id: "",
                    oldPwd: "",
                    newPwd: "",
                    confirmPwd: ""
                },
                formRule: {
                    oldPwd: [
                        {required: true, message: "请输入原密码", trigger: "blur"},
                        {validator: checkISNull, trigger: "blur"}
                    ],
                    newPwd: [
                        {required: true, message: "请输入新密码", trigger: "blur"},
                        {validator: checkISNull, trigger: "blur"}
                    ],
                    confirmPwd: [
                        {required: true, message: "请确认新密码", trigger: "blur"},
                        {validator: checkISNull, trigger: "blur"}
                    ]
                }
            };
        },
        methods: {
            handleChangepwd() {
                let that = this;

                let sha256 = require("js-sha256").sha256; //这里用的是require方法，所以没用import

                if (that.form.confirmPwd !== that.form.newPwd) {
                    that.$message.error({
                        showClose: true,
                        message: "两次密码不一致",
                        duration: 2000
                    });
                    return;
                }
                let args = {
                    user_id: that.form.user_id,
                    old_password: sha256(that.form.oldPwd),
                    password: sha256(that.form.newPwd)
                };
                this.$refs['form'].validate(valid => {
                    if (valid) {
                        API.changePassword(args)
                            .then(
                                function (result) {
                                    that.loading = false;
                                    //修改成功
                                    that.$message.success({
                                        showClose: true,
                                        message: "修改成功,即将自动跳转至登录页！"
                                    });
                                    API.logout().then(() => {
                                        setTimeout(() => {
                                            bus.$emit('goto', '/login');
                                        }, 3000);
                                    });
                                }
                            )
                    }
                });

            }
        },
        mounted() {
            let user = localStorage.getItem("access-user");
            if (user) {
                user = JSON.parse(user);
                this.form.user_id = user.id || "";
            }
        }
    };
</script>
