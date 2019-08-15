<template>
    <el-row class="warp">
        <el-col :span="24" class="warp-breadcrum">
            <el-breadcrumb separator="/">
                <!-- <el-breadcrumb-item :to="{ path: '/' }"><b>首页</b></el-breadcrumb-item> -->
                <!-- <el-breadcrumb-item>审核医生列表</el-breadcrumb-item> -->
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
                        <el-input v-model.trim="filters.name" placeholder="审核医生姓名" style="min-width: 240px;"
                                  @keyup.enter.native="handleSearch"></el-input>
                    </el-form-item>
                    <el-date-picker
                            v-model="filters.reportTimeSelected"
                            type="datetimerange"
                            :picker-options="reportTimePicker"
                            range-separator="至"
                            start-placeholder="上传开始日期"
                            end-placeholder="上传结束日期"
                            align="center"
                            :default-time="['00:00:00', '23:59:00']"
                            format="yyyy/MM/dd HH:mm"
                            value-format="yyyy/MM/dd HH:mm"
                            @change="handleSearch"
                    >
                    </el-date-picker>
                    <el-form-item style="margin-left: 10px">
                        <el-button type="primary" @click="handleSearch">查询</el-button>
                        <el-button type="primary" @click="openAddForm">添加新审核医生</el-button>
                    </el-form-item>
                </el-form>
            </el-col>

            <!--列表-->
            <el-table :data="users" highlight-current-row v-loading="loading" style="width: 100%;">
                <el-table-column prop="user_id" label="编号">
                </el-table-column>
                <el-table-column prop="login_name" label="账户名">
                </el-table-column>
                <el-table-column prop="nick_name" label="审核医生姓名">
                </el-table-column>
                <el-table-column prop="work_load" label="工作量" sortable>
                </el-table-column>
                <el-table-column
                        fixed="right"
                        label="操作"
                        width="200">
                    <template slot-scope="scope">
                        <el-button @click="editFormClick(scope.$index,scope.row)" type="primary" size="small">编辑资料
                        </el-button>
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
                    <el-form-item label="上传签章">
                        <el-upload
                                v-if="hackReset"
                                class="avatar-uploader"
                                action="/user/upload_image/"
                                :show-file-list="false"
                                :on-success="handleAvatarSuccess"
                                :before-upload="beforeAvatarUpload">
                            <img v-if="editForm.signature_id" :src="'/user/signature/' + editForm.signature_id" class="avatar">
                            <i v-else class="el-icon-plus avatar-uploader-icon"></i>
                        </el-upload>
                    </el-form-item>
                    <el-form-item label="姓名" prop="nick_name">
                        <el-input v-model.trim="editForm.nick_name" auto-complete="off">
                        </el-input>
                    </el-form-item>
                    <!-- <el-form-item label="出版日期">
                      <el-date-picker type="date" placeholder="选择日期" v-model="editForm.publishAt"></el-date-picker>
                    </el-form-item> -->
                    <el-form-item label="简介" prop="description">
                        <el-input type="textarea" v-model.trim="editForm.description" :rows="8"></el-input>
                    </el-form-item>
                </el-form>
                <div slot="footer" class="dialog-footer">
                    <el-button type="info" @click="frozenUser(editForm)">{{editForm.disabled ? '解冻' : '冻结'}}</el-button>
                    <el-button @click.native="editFormVisible = false">取消</el-button>
                    <el-button type="primary" @click.native="editSubmit">提交</el-button>
                </div>
            </el-dialog>

            <!--新增界面-->
            <el-dialog title="新增" :visible.sync="addFormVisible" :close-on-click-modal="false"
                       :before-close="cancelAddForm">
                <el-form :model="addForm" label-width="80px" :rules="addFormRules" ref="addForm">
                    <el-form-item label="上传签章">
                        <el-upload
                                v-if="hackReset"
                                class="avatar-uploader"
                                action="/user/upload_image/"
                                :show-file-list="false"
                                :on-success="handleAvatarSuccess"
                                :before-upload="beforeAvatarUpload">
                            <img v-if="addForm.signature_id" :src="'/user/signature/' + addForm.signature_id" class="avatar">
                            <i v-else class="el-icon-plus avatar-uploader-icon"></i>
                        </el-upload>
                    </el-form-item>
                    <el-form-item label="登录名" prop="login_name">
                        <el-input v-model.trim="addForm.login_name" auto-complete="off">
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
                    <el-button @click.native="cancelAddForm">取消</el-button>
                    <el-button type="primary" @click.native="addSubmit" :loading="addLoading">提交</el-button>
                </div>
            </el-dialog>
        </el-col>
    </el-row>
</template>

<script>
    import API from "../../api/api_user";
    import StaticsTitle from "./staticsTitle.vue";
    import Util from '../../common/util';

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
                hackReset: true,
                hackResetDialog: true,
                filters: {
                    name: "",
                    reportTimeSelected: ''
                },
                reportTimePicker: {
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
                            text: '最近一周',
                            onClick(picker) {
                                picker.$emit('pick', Util.calcShortCuts(7));
                            }
                        }, {
                            text: '最近一个月',
                            onClick(picker) {
                                picker.$emit('pick', Util.calcShortCuts(30));
                            }
                        }, {
                            text: '最近三个月',
                            onClick(picker) {
                                picker.$emit('pick', Util.calcShortCuts(90));
                            }
                        }]
                },
                prepend: '',
                users: [],
                total: 0,
                page: 1,
                limit: 10,
                loading: false,

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
                    signature_id: "",
                    description: ""
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
                    signature_id: "",
                    description: ""
                }
            };
        },
        components: {
            StaticsTitle
        },
        methods: {
            cancelAddForm() {
                this.addFormVisible = false;
                this.addForm.signature_id = '';
            },
//            cancelEditForm () {
////                this.editForm = JSON.parse(JSON.stringify(row));
//            },
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
            handleAvatarSuccess(res, file) {
                if (this.editFormVisible) {
                    this.editForm.signature_id = file.response;
                } else {
                    this.addForm.signature_id = file.response;
                }
                this.hackReset = false;
                this.$nextTick(() => {
                    this.hackReset = true;
                });
                //   this.imageUrl = URL.createObjectURL(file.raw);
            },
            beforeAvatarUpload(file) {
                const isLt2M = file.size / 1024 / 1024 < 4;

                let isImage = file.type.indexOf('image') != -1
                if (!isImage) {
                    this.$message.error('上传文件只能是图片格式!');
                    return;
                }
                if (!isLt2M) {
                    this.$message.error('上传签章图片大小不能超过 4MB!');
                }
                return isImage && isLt2M;
            },
            editFormClick(index, row) {
                if (row.signature) {
                    row.signature_id = row.signature;
                }
                this.editForm = JSON.parse(JSON.stringify(row));
                this.editFormVisible = true;
                this.hackResetDialog = false;
                this.$nextTick(() => {
                    this.hackResetDialog = true;
                })
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
                    "nick_name": that.addForm.nick_name,
                    "login_name": that.prepend + that.addForm.login_name,
                    "password": sha256(that.addForm.password),
                    "description": that.addForm.description,
                    "signature_id": that.addForm.signature_id,
                    "role": 'ROLE_AUDITOR'
                };

                this.$refs['addForm'].validate(valid => {
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
                if (that.filters.reportTimeSelected) {
                    params['start_time'] = that.filters.reportTimeSelected[0] + ':00';
                    let endDate = new Date(that.filters.reportTimeSelected[1] + ':00');
                    endDate.setMinutes(endDate.getMinutes() + 1);
                    params['end_time'] = Util.formatTimeM(endDate);
                }
                that.loading = true;
                API.auditorList(params)
                    .then(
                        function (result) {
                            that.loading = false;
                            if (result) {
                                that.total = result.total;
                                that.users = result.users;
                                // result.data.map(item => {
                                //   that.users.push({
                                //     nick_name: item.fields.nick_name,
                                //     work_load: "70%",
                                //     user_id: item.pk
                                //   });
                                // });
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

<style>
    .avatar-uploader .el-upload {
        border: 1px dashed #d9d9d9;
        border-radius: 6px;
        cursor: pointer;
        position: relative;
        overflow: hidden;
    }

    .avatar-uploader .el-upload:hover {
        border-color: #409EFF;
    }

    .avatar-uploader-icon {
        font-size: 28px;
        color: #8c939d;
        width: 178px;
        height: 178px;
        line-height: 178px;
        text-align: center;
    }

    .avatar {
        width: 178px;
        height: 178px;
        display: block;
    }
</style>
