<template>
    <el-row class="warp">
        <el-col :span="24" class="warp-breadcrum" :loading="loading">
            <el-breadcrumb separator="/">
                <!-- <el-breadcrumb-item><b>首页</b></el-breadcrumb-item>
                <el-breadcrumb-item>设置</el-breadcrumb-item> -->
                <el-breadcrumb-item>个人信息</el-breadcrumb-item>
            </el-breadcrumb>
        </el-col>

        <el-col :span="24" class="warp-main">
            <el-form ref="form" :model="form" :rules="rules" label-width="80px">
                <!-- <el-form-item label="账号">
                  <el-input v-model="form.useranme" disabled></el-input>
                </el-form-item> -->
                <el-form-item prop="nickname" label="昵称">
                    <el-input v-model="form.nickname"></el-input>
                </el-form-item>
                <el-form-item prop="description" label="简介">
                    <el-input v-model="form.description"></el-input>
                </el-form-item>
                <!-- <el-form-item prop="email" label="邮箱">
                  <el-input v-model="form.email"></el-input>
                </el-form-item> -->
                <el-form-item>
                    <el-button type="primary" @click="handleSaveProfile">修改并保存</el-button>
                </el-form-item>
            </el-form>
        </el-col>
    </el-row>
</template>

<script>
    import API from '../../api/api_user';
    import {bus} from '../../bus.js'

    export default {
        data() {
            return {
                loading: false,
                form: {
                    useranme: '',
                    nickname: '',
                    name: '',
                    description: '',
                    email: ''
                },
                rules: {
                    nickname: [
                        {required: true, message: '请输入昵称', trigger: 'blur'}
                    ],
                    // email: [
                    //   {required: true, message: '请输入邮箱', trigger: 'blur'},
                    //   {type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur,change'}
                    // ]
                },
            }
        },
        methods: {
            handleSaveProfile() {
                let that = this;
                that.$refs.form.validate((valid) => {
                    if (valid) {
                        that.loading = true;
                        let args = {
                            user_id: that.form.user_id,
                            nick_name: that.form.nickname,
                            description: that.form.description,
                            // email: that.form.email
                        };
                        API.userUpdate(args).then(function (result) {
                            that.loading = false;
                            //修改成功
                            let user = JSON.parse(window.localStorage.getItem('access-user'));
                            user.nickname = that.form.nickname;
                            user.description = that.form.description;
                            // user.email = that.form.email;
                            localStorage.setItem('access-user', JSON.stringify(user));
                            bus.$emit('setNickName', that.form.nickname);
                            that.$message.success({showClose: true, message: '修改成功', duration: 2000});
                            that.$router.go(-1);//修改成功后回到上一个页面
                        }, function (err) {
                            that.loading = false;
                        }).catch(function (error) {
                            that.loading = false;
                        });
                    }
                });
            }
        },
        mounted() {
            let user = localStorage.getItem('access-user');
            if (user) {
                user = JSON.parse(user);
                this.form.useranme = user.username;
                this.form.nickname = user.nickname || '';
                this.form.email = user.email || '';
                this.form.name = user.name || '';
                this.form.user_id = user.id || '';
                this.form.description = user.description || '';
            }
        }
    }
</script>
