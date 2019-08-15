<template>
    <el-row class="warp">
        <el-col :span="24" class="warp-breadcrum">
            <el-breadcrumb separator="/">
                <!-- <el-breadcrumb-item :to="{ path: '/' }"><b>首页</b></el-breadcrumb-item> -->
                <!-- <el-breadcrumb-item>上传用户列表</el-breadcrumb-item> -->
            </el-breadcrumb>
        </el-col>

        <div>
            <StaticsTitle/>
        </div>

        <el-col :span="24" class="warp-main" v-loading="loading" element-loading-text="拼命加载中">
            <!--工具条-->
            <el-col :span="24" class="toolbar" style="padding-bottom: 0px;">
                <el-form :inline="true" :model="filters">
                    <el-form-item>
                        <el-input v-model="filters.name" placeholder="用户姓名" style="min-width: 240px;"
                                  @keyup.enter.native="handleSearch"></el-input>
                    </el-form-item>
                    <el-form-item>
                        <el-button type="primary" @click="handleSearch">查询</el-button>
                        <el-button type="primary" @click="openAddForm">添加新上传用户</el-button>
                    </el-form-item>
                </el-form>
            </el-col>

            <!--列表-->
            <el-table :data="users" highlight-current-row v-loading="loading" style="width: 100%;">
                <el-table-column prop="user_id" label="编号">
                </el-table-column>
                <el-table-column prop="login_name" label="账户名">
                </el-table-column>
                <el-table-column prop="nick_name" label="上传用户姓名">
                </el-table-column>

                <el-table-column label="操作">
                    <template slot-scope="scope">
                        <el-button type="primary" size="small" @click="editFormClick(scope.$index,scope.row)">编辑资料
                        </el-button>
                        <!-- <el-button type="danger" @click="delBook(scope.$index,scope.row)" size="small">删除</el-button> -->
                    </template>
                </el-table-column>
            </el-table>

            <!--工具条-->
            <el-col :span="24" class="toolbar">
                <!-- <el-button type="danger" @click="batchDeleteBook" :disabled="this.sels.length===0">批量删除</el-button> -->
                <el-pagination
                        @current-change="handleCurrentChange"
                        :page-size="10"
                        background
                        layout="total, prev, pager, next, jumper"
                        :total="total"
                        style="margin-top: 10px"
                >
                </el-pagination>
            </el-col>


            <el-dialog title="编辑" :visible.sync="editFormVisible" :close-on-click-modal="false">
                <el-form :model="editForm" label-width="100px" :rules="editFormRules" ref="editForm"
                         v-if="hackResetDialog">
                    <el-form-item label="姓名" prop="nick_name">
                        <el-input v-model="editForm.nick_name" auto-complete="off">
                        </el-input>
                    </el-form-item>
                    <el-form-item label="简介" prop="description">
                        <el-input type="textarea" v-model="editForm.description" :rows="8"></el-input>
                    </el-form-item>
                </el-form>
                <div slot="footer" class="dialog-footer">
                    <el-button type="info" @click="frozenUser(editForm)">{{editForm.disabled ? '解冻' : '冻结'}}</el-button>
                    <el-button @click.native="editFormVisible = false">取消</el-button>
                    <el-button type="primary" @click.native="editSubmit">提交</el-button>
                </div>
            </el-dialog>

            <!--新增界面-->
            <el-dialog title="新增" :visible.sync="addFormVisible" :close-on-click-modal="false">
                <el-form :model="addForm" label-width="80px" :rules="addFormRules" ref="addForm">
                    <el-form-item label="登录名" prop="login_name">
                        <el-input v-model="addForm.login_name" auto-complete="off">
                            <template slot="prepend">{{prepend}}</template>
                        </el-input>
                    </el-form-item>
                    <el-form-item label="姓名" prop="nick_name">
                        <el-input v-model="addForm.nick_name" auto-complete="off"></el-input>
                    </el-form-item>
                    <el-form-item label="密码" prop="password">
                        <el-input v-model="addForm.password" auto-complete="off" type="password"></el-input>
                    </el-form-item>
                    <!-- <el-form-item label="出版日期">
                      <el-date-picker type="date" placeholder="选择日期" v-model="addForm.publishAt"></el-date-picker>
                    </el-form-item> -->
                    <el-form-item label="简介" prop="description">
                        <el-input type="textarea" v-model="addForm.description" :rows="8"></el-input>
                    </el-form-item>
                </el-form>
                <div slot="footer" class="dialog-footer">
                    <el-button @click.native="addFormVisible = false">取消</el-button>
                    <el-button type="primary" @click.native="addSubmit" :loading="addLoading">提交</el-button>
                </div>
            </el-dialog>
        </el-col>
    </el-row>
</template>

<script>
    import API from "../../api/api_user";
    import StaticsTitle from "./staticsTitle.vue";

    export default {
        data() {
            let checkISNull = (rule, value, callback) => {
                let regPassword = /^[\w]{6,16}$/i;
                if (!value) {
                    callback(new Error('输入不能为空'))
                } else {
                    if (rule.field === 'password') {
                        if (!regPassword.test(value)) {
                            callback(new Error('密码由6-16位字母或数字组成！'))
                        }
                    }
                    if (/\s+/g.test(value)) {
                        callback(new Error('不能输入空格'))
                    } else {
                        callback();
                    }
                }
            };
            return {
                hackResetDialog: true,
                filters: {
                    name: ""
                },
                prepend: '',
                loading: false,
                users: [],
                total: 0,
                page: 1,
                limit: 10,
                //编辑相关数据
                editFormVisible: false, //编辑界面是否显示
                editFormRules: {
                    nick_name: [
                        {required: true, message: "请输入姓名", trigger: "blur"},
                        {validator: checkISNull, trigger: "blur"}
                    ],
                    description: [
                        {required: false, message: "请输入简介", trigger: "blur"}
                    ]
                },
                editForm: {
                    user_id: 0,
                    nick_name: "",
                    publishAt: "",
                    description: "",
                    disabled: false,
                },

                //新增相关数据
                addFormVisible: false, //新增界面是否显示
                addLoading: false,
                addFormRules: {
                    login_name: [
                        {required: true, message: "请输入登录名", trigger: "blur"},
                        {validator: checkISNull, trigger: "blur"}
                    ],
                    nick_name: [
                        {required: true, message: "请输入姓名", trigger: "blur"},
                        {validator: checkISNull, trigger: "blur"}
                    ],
                    password: [
                        {required: true, message: "请输入密码", trigger: "blur"},
                        {validator: checkISNull, trigger: "blur"}
                    ],
                    description: [
                        {required: false, message: "请输入简介", trigger: "blur"}
                    ]
                },
                addForm: {
                    login_name: "",
                    nick_name: "",
                    password: "",
                    publishAt: "",
                    description: ""
                }
            };
        },
        components: {
            StaticsTitle
        },
        methods: {
            frozenUser(editForm) {
                let username = editForm.login_name;
                if (editForm.disabled) {
                    API.unFrozenUser({
                        username: username
                    }).then(data => {
                        this.editFormVisible = false
                        this.$message({
                            type: 'success',
                            message: '解冻账户成功'
                        });
                        this.search();
                    }).catch(err => {
                        this.editFormVisible = false
                    })
                } else {
                    API.frozenUser({
                        username: username
                    }).then(data => {
                        this.editFormVisible = false
                        this.$message({
                            type: 'success',
                            message: '冻结账户成功'
                        });
                        this.search();
                    }).catch(err => {
                        this.editFormVisible = false
                    })
                }
            },
            editFormClick(index, row) {
                this.editForm = JSON.parse(JSON.stringify(row));
                this.editFormVisible = true;
                // this.editForm.user_id = row.user_id;
                this.hackResetDialog = false;
                this.$nextTick(() => {
                    this.hackResetDialog = true;
                });
            },
            editSubmit() {
                let that = this;
                let params = that.editForm;
                this.$refs['editForm'].validate(valid => {
                    if (valid) {
                        API.userUpdate(params).then(function (result) {
                            that.loading = false;
                            that.$message.success({showClose: true, message: '修改成功', duration: 1500});
                            that.editFormVisible = false;
                            that.search();
                        });
                    }
                });
            },
            addSubmit() {
                let that = this;
                let sha256 = require("js-sha256").sha256;//这里用的是require方法，所以没用import
                let params = {
                    "nick_name": this.addForm.nick_name,
                    "login_name": this.prepend + this.addForm.login_name,
                    "password": sha256(this.addForm.password),
                    "role": 'ROLE_UPLOADER'
                };

                this.$refs['addForm'].validate((valid) => {
                    if (valid) {
                        API.userCreate(params).then(result => {
                            that.loading = false;
                            that.$message.success({showClose: true, message: '添加成功', duration: 1500});
                            that.addFormVisible = false;
                            this.search();
                        });
                    }
                });
            },
            handleCurrentChange(val) {
                this.page = val;
                this.search();
            },
            handleSearch() {
                this.total = 0;
                this.page = 1;
                this.search();
            },
            //获取用户列表
            search: function () {
                let that = this;
                let params = {
                    page: that.page,
                    limit: 10,
                    nick_name: that.filters.name
                };

                that.loading = true;
                that.users = [];
                API.uploaderList(params)
                    .then(
                        function (result) {
                            that.loading = false;
                            if (result) {
                                that.total = result.total;
                                result.data.map(item => {
                                    that.users.push({
                                        description: item.fields.description,
                                        nick_name: item.fields.nick_name,
                                        login_name: item.fields.login_name,
                                        user_id: item.pk,
                                        disabled: item.fields.disabled
                                    });
                                });
                            }
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
            },
            openAddForm() {
                this.addFormVisible = true;
                this.$nextTick(() => {
                    this.$refs['addForm'].resetFields();
                });
            }
        },
        mounted() {
            this.handleSearch();
            this.prepend = localStorage.getItem('preName') + '-';
        }
    };
</script>

<style scoped>
</style>
