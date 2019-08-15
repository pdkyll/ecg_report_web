<template>
    <el-row class="warp doctor-manage-box">
        <el-col :span="24" class="warp-breadcrum">
            <el-breadcrumb separator="/">
            </el-breadcrumb>
        </el-col>
        <el-col :span="24" class="warp-main" v-loading="loading" element-loading-text="拼命加载中">
            <!--工具条-->
            <el-col :span="24" class="toolbar" style="padding-bottom: 0px;">
                <el-form :inline="true" :model="filters" :rules="searchReportsFormRules" ref="searchReportsForm">
                    <el-form-item label="医生账户名：" prop="name">
                        <el-input v-model.trim="filters.name" placeholder="请输入" class="select-common"
                                  @keyup.enter.native="handleSearch">
                            <i slot="suffix" class="el-input__icon el-icon-error"
                               v-if="filters.name!==''" style="cursor: pointer;" @click="filters.name='';handleSearch()"></i>
                        </el-input>
                    </el-form-item>
                    <label for="" class="input-label">所属医院：</label>
                    <ExpandTree style="margin-right: 10px"
                                ref="expandTree"
                                @selectValue="selectedHospital"
                                @focus="getHospitals"
                                :treeData="treeData"
                                :loading="getHospitalLoading"
                                :default-value="filters.hospital_label"
                                @clear="clearSelectedHospital"
                    >
                    </ExpandTree>
                    <label for="" class="input-label">状态：</label>
                    <el-select v-model="filters.disabled" placeholder="请选择" clearable @change="handleSearch"
                               style="margin-right: 10px">
                        <el-option
                                v-for="item in availableOptions"
                                :key="item.value"
                                :label="item.label"
                                :value="item.value">
                        </el-option>
                    </el-select>
                    <el-date-picker
                            v-model="filters.reportTimeSelected"
                            type="datetimerange"
                            :picker-options="reportTimePicker"
                            range-separator="至"
                            start-placeholder="开始日期"
                            end-placeholder="结束日期"
                            align="center"
                            :default-time="['00:00:00', '23:59:00']"
                            format="yyyy/MM/dd HH:mm"
                            value-format="yyyy/MM/dd HH:mm"
                            @change="handleSearch"
                    >
                    </el-date-picker>
                    <el-form-item>
                        <el-button type="primary" @click="handleSearch" style="margin-left: 10px">查询
                        </el-button>
                        <el-button @click="reset">重置</el-button>
                        <el-button @click="showAddDoctorDialog" type="success">+ 新建</el-button>
                    </el-form-item>
                </el-form>
            </el-col>
            <el-col>
                <el-tabs v-model="filters.type" type="card" @tab-click="handleSearch" ref="doctorTypeTab">
                    <el-tab-pane label="全部" name="ALL"></el-tab-pane>
                    <el-tab-pane label="标注医生" name="ROLE_EDITOR">
                        <span slot="label">
                            <el-badge :value="userOnline.editorOnlineCount" class="item" ref="editorOnlineCount">
                                标注医生
                            </el-badge>
                        </span>
                    </el-tab-pane>
                    <el-tab-pane label="审核医生" name="ROLE_AUDITOR">
                        <span slot="label">
                            <el-badge :value="userOnline.auditorOnlineCount" class="item" ref="auditorOnlineCount">
                                审核医生
                            </el-badge>
                        </span>
                    </el-tab-pane>
                    <el-tab-pane label="上传医生" name="ROLE_UPLOADER">
                         <span slot="label">
                            <el-badge :value="userOnline.uploaderOnlineCount" class="item" ref="uploaderOnlineCount">
                                上传医生
                            </el-badge>
                        </span>
                    </el-tab-pane>
                </el-tabs>
            </el-col>
            <!--列表-->
            <el-table :data="doctorList"
                      highlight-current-row
                      v-loading="loading"
                      style="width: 100%;"
                      @sort-change="tableSort"
                      ref="usersTable"
                      :row-key="getRowKeys"
                      :expand-row-keys="expands"
                      @expand-change="doctorLoad"
            >
                <el-table-column type="expand">
                    <template slot-scope="props">
                        <div style="width: 400px;margin: auto;border: 1px solid #ccc;padding: 5px"
                             v-loading="getDoctorDetailLoading">
                            <div class="table-expand table-expand-title">
                                <div>所属医院</div>
                                <div>业务量</div>
                            </div>
                            <div class="table-expand table-expand-item" v-for="item in doctorDetail">
                                <div class="table-expand-hospital" :title="item.hospitalName">
                                    {{item.hospitalName }}
                                </div>
                                <div>
                                    {{item.workNum }}
                                </div>
                            </div>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column prop="doctorName" label="医生账户名" sortable="custom">
                </el-table-column>
                <el-table-column prop="doctorHospital" label="所属医院" sortable="custom">
                </el-table-column>
                <el-table-column prop="hospitalCount" label="服务机构" sortable="custom">
                </el-table-column>
                <el-table-column prop="workNum" label="操作业务量" sortable="custom">
                </el-table-column>
                <el-table-column prop="userType" label="医生角色" sortable="custom">
                    <template slot-scope="scope">
                        {{userTypeMap[scope.row.userType]}}
                    </template>
                </el-table-column>
                <el-table-column prop="online" label="登录状态">
                    <template slot-scope="scope">
                        <div>
                            <span style="margin-right: 2px">{{scope.row.online ? '在线' : '离线'}}</span>
                            <span :style="{color:scope.row.online?'#12d726':'#fe010f'}">●</span>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column prop="disabled" label="用户状态" sortable="custom">
                    <template slot-scope="scope">
                        <div>
                            <span style="margin-right: 2px">{{scope.row.disabled ? '禁用' : '正常'}}</span>
                            <span :style="{color:scope.row.disabled?'#fe010f':'#12d726'}">●</span>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column prop="lastLoginTimeStr" label="最后登录时间" sortable="custom">
                </el-table-column>
                <el-table-column
                        fixed="right"
                        label="操作"
                        width="280">
                    <template slot-scope="scope">
                        <el-button @click=""
                                   type="text"
                                   size="small"
                                   @click="switchDoctorState(scope.row)"
                        >
                            {{scope.row.disabled ? '启用' : '禁用'}}
                        </el-button>
                        <el-button @click=""
                                   type="text"
                                   size="small"
                                   @click="deleteDoctor(scope.row)"
                        >
                            删除
                        </el-button>
                        <el-button @click="editDoctor(scope.row)"
                                   type="text"
                                   size="small"
                        >
                            编辑
                        </el-button>
                        <el-button @click=""
                                   type="text"
                                   size="small"
                                   @click="resetPassword(scope.row)"
                        >
                            重置密码
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
            <el-dialog
                    :title="hospitalTitle"
                    :visible.sync="addDoctorDialogState"
                    width="30%"
                    @close="closeAddDoctorDialog"
            >
                <el-form ref="addDoctorForm" :model="addDoctorForm" :rules="addDoctorFormRules" label-width="80px"
                         style="margin-top: 10px">
                    <el-form-item label="所属医院" v-if="userType===4" prop="institution_id">
                        <ExpandTree style="margin-right: 10px"
                                    ref="expandTreeAdd"
                                    @selectValue="selectedDoctorHospital"
                                    @focus="getHospitals"
                                    :treeData="treeData"
                                    :loading="getHospitalLoading"
                        >
                        </ExpandTree>
                    </el-form-item>
                    <el-form-item label="账户" prop="login_name">
                        <el-input placeholder="请输入" v-model.trim="addDoctorForm.login_name">
                            <template slot="prepend">{{addDoctorForm.institution_prefix}}-</template>
                        </el-input>
                    </el-form-item>
                    <el-form-item label="姓名" prop="nick_name">
                        <el-input placeholder="请输入" v-model.trim="addDoctorForm.nick_name">
                        </el-input>
                    </el-form-item>
                    <el-form-item label="状态">
                        <el-input v-model.trim="addDoctorForm.disabled" disabled>
                        </el-input>
                    </el-form-item>
                    <el-form-item label="权限" prop="role">
                        <el-radio v-model="addDoctorForm.role" label="ROLE_EDITOR">标注医生</el-radio>
                        <el-radio v-model="addDoctorForm.role" label="ROLE_AUDITOR">审核医生</el-radio>
                        <el-radio v-model="addDoctorForm.role" label="ROLE_UPLOADER">上传医生</el-radio>
                    </el-form-item>
                    <el-form-item label="签章" prop="signature" v-if="addDoctorForm.role==='ROLE_AUDITOR'">
                        <el-upload
                                class="avatar-uploader"
                                action=""
                                list-type="picture"
                                :accept="'image/png'"
                                :on-change="getAddSignatureFile"
                                :auto-upload="false"
                                :limit="1"
                                :on-exceed="uploadFileLimit"
                                :on-remove="removeAddUploadFile"
                        >
                            <i class="el-icon-plus avatar-uploader-icon"></i>
                        </el-upload>
                    </el-form-item>
                    <el-form-item label="简介" prop="description">
                        <el-input
                                type="textarea"
                                placeholder="请输入"
                                v-model.trim="addDoctorForm.description">
                        </el-input>
                    </el-form-item>
                </el-form>
                <span slot="footer" class="dialog-footer">
                    <el-button @click="addDoctorDialogState = false">取 消</el-button>
                    <el-button type="primary" @click="confirmAddDoctor">确定</el-button>
                </span>
            </el-dialog>
            <el-dialog
                    :title="hospitalTitle"
                    :visible.sync="editDoctorDialogState"
                    width="30%"
                    @close="closeEditDoctorDialog"
            >
                <el-form ref="editDoctorForm" :model="editDoctorForm" :rules="editDoctorFormRules" label-width="80px"
                         style="margin-top: 10px">
                    <el-form-item label="账户" prop="login_name">
                        <el-input placeholder="请输入" v-model.trim="editDoctorForm.login_name" disabled>
                        </el-input>
                    </el-form-item>
                    <el-form-item label="姓名" prop="nick_name">
                        <el-input placeholder="请输入" v-model.trim="editDoctorForm.nick_name">
                        </el-input>
                    </el-form-item>
                    <el-form-item label="状态">
                        <el-input v-model.trim="editDoctorForm.disabled" disabled>
                        </el-input>
                    </el-form-item>
                    <el-form-item label="权限" prop="role">
                        <el-radio v-model="editDoctorForm.role" label="ROLE_EDITOR" disabled>标注医生</el-radio>
                        <el-radio v-model="editDoctorForm.role" label="ROLE_AUDITOR" disabled>审核医生</el-radio>
                        <el-radio v-model="editDoctorForm.role" label="ROLE_UPLOADER" disabled>上传医生</el-radio>
                    </el-form-item>
                    <el-form-item label="签章" prop="signature" v-if="editDoctorForm.role==='ROLE_AUDITOR'">
                        <el-upload
                                class="avatar-uploader"
                                action=""
                                list-type="picture"
                                :accept="'image/png'"
                                :on-change="getEditSignatureFile"
                                :auto-upload="false"
                                :limit="1"
                                :on-exceed="uploadFileLimit"
                                ref="editSignatureUploader"
                                :on-remove="removeEditUploadFile"
                        >
                            <i class="el-icon-plus avatar-uploader-icon" v-if="editDoctorForm.signatureUrl===''"></i>
                            <img v-else :src="editDoctorForm.signatureUrl" class="avatar">
                        </el-upload>
                    </el-form-item>
                    <el-form-item label="简介" prop="description">
                        <el-input
                                type="textarea"
                                placeholder="请输入"
                                v-model.trim="editDoctorForm.description">
                        </el-input>
                    </el-form-item>
                </el-form>
                <span slot="footer" class="dialog-footer">
                    <el-button @click="editDoctorDialogState = false;">取 消</el-button>
                    <el-button type="primary" @click="confirmEditDoctor">确定</el-button>
                </span>
            </el-dialog>
        </el-col>
    </el-row>
</template>

<script>
    import API from "../../api/api_user";
    import APIReport from '../../api/api_ecg_view';
    import APIReportServe from '../../api/api_report';
    import APISuperAdmin from '../../api/api_super_admin';
    import Util from '../../common/util';
    import ExpandTree from '../common/ExpandTree.vue';
    import {bus} from '../../bus';
    import axios from "axios";

    export default {
        components: {
            ExpandTree
        },
        data() {
            return {
                loading: false,
                total: 0,
                doctorList: [],
                page: 1,
                limit: 10,
                setFirstLine: false,
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
                filters: {
                    name: "",
                    reportTimeSelected: '',
                    type: 'ALL',
                    sort: 'LOGIN_STATE',
                    sort_state: 'DOWN',
                    hospital_id: '',
                    disabled: ''
                },
                sortNameMap: {
                    doctorName: 'NAME',
                    doctorHospital: 'HOSPITAL',
                    hospitalCount: 'WORK_HOSPITAL_NUM',
                    workNum: 'WORK_NUM',
                    userType: 'USER_TYPE',
                    disabled: 'USER_STATE',
                    lastLoginTime: 'LAST_LOGIN_TIME'
                },
                sortOrderMap: {
                    ascending: 'UP',
                    descending: 'DOWN'
                },
                userTypeMap: {
                    ROLE_EDITOR: '标注医生',
                    ROLE_AUDITOR: '审核医生',
                    ROLE_UPLOADER: '上传医生'
                },
                treeData: [],
                getHospitalLoading: false,
                userOnline: {},
                availableOptions: [{
                    value: false,
                    label: '正常'
                }, {
                    value: true,
                    label: '禁用'
                }],
                value: '',
                addDoctorDialogState: false,
                addDoctorForm: {
                    institution_id: '',
                    institution_prefix: localStorage.getItem('preName'),
                    login_name: '',
                    nick_name: '',
                    role: '',
                    disabled: '正常',
                    signature: null,
                    description: ''
                },
                editDoctorForm: {
                    doctorId: 0,
                    institution_id: '',
                    institution_prefix: localStorage.getItem('preName'),
                    login_name: '',
                    nick_name: '',
                    role: '',
                    disabled: '正常',
                    description: '',
                    signature: null,
                    signatureUrl: ''
                },
                doctorDetail: [],
                expands: [],
                addDoctorFormRules: {
                    institution_id: [
                        {required: true, message: '请选择所属医院', trigger: 'change'},
                    ],
                    login_name: [
                        {required: true, message: '请输入账号名', trigger: 'blur'},
                        {pattern: /^[\u4e00-\u9fa5_a-zA-Z0-9_]+$/, message: '只能输入中文、英文、数字及"_"'},
                        {pattern: /^[\u4e00-\u9fa5_a-zA-Z0-9_]{1,25}$/, message: '不能超过25个字符'},
                    ],
                    nick_name: [
                        {required: true, message: '请输入姓名', trigger: 'blur'},
                        {pattern: /^[\u4e00-\u9fa5_a-zA-Z0-9_]+$/, message: '只能输入中文、英文、数字及"_"'},
                        {pattern: /^[\u4e00-\u9fa5_a-zA-Z0-9_]{1,25}$/, message: '不能超过25个字符'},
                    ],
                    role: [
                        {required: true, message: '请选择医生权限', trigger: 'change'},
                    ],
                    signature: [
                        {required: true, message: '请上传签章', trigger: 'change'},
                    ],
                    description: [
                        {pattern: /^[^\s]*$/, message: '简介不能包含空格'}
                    ]
                },
                searchReportsFormRules: {
                    id: [
                        {pattern: /^\d+$/, message: '报告ID只能是数字'},
                        {pattern: /^\d{1,25}$/, message: '报告ID最多输入25个字符'},
                    ],
                    name: [
                        {pattern: /^[\u4e00-\u9fa5_a-zA-Z0-9_\-]+$/, message: '只能输入中文、英文、数字及"_"和"-"'},
                        {pattern: /^[\u4e00-\u9fa5_a-zA-Z0-9_\-]{1,25}$/, message: '不能超过25个字符'},
                    ]
                },
                editDoctorFormRules: {
                    nick_name: [
                        {required: true, message: '请输入姓名', trigger: 'blur'},
                        {pattern: /^[^\s]*$/, message: '姓名不能包含空格'}
                    ],
                    description: [
                        {pattern: /^[^\s]*$/, message: '简介不能包含空格'}
                    ]
                },
                editDoctorDialogState: false,
                getDoctorDetailLoading: false,
            };
        },
        computed: {
            hospitalTitle: () => {
                return localStorage.getItem('title');
            },
            userType: () => {
                return JSON.parse(localStorage.getItem('access-user')).userType;
            },
            userId: () => {
                return JSON.parse(localStorage.getItem('access-user')).user_id;
            }
        },
        watch: {},
        methods: {
            handleSearch(callback) {
                this.page = 1;
                this.total = 0;
                this.expands = [];
                this.$refs.searchReportsForm.validate(validate => {
                    if (validate) {
                        this.search(callback);
                    }
                });
            },
            //获取用户列表
            search: function (callback) {
                let params = {
                    page: this.page,
                    limit: this.limit,
                    name: this.filters.name,
                    hospital_id: this.filters.hospital_id,
                    disabled: this.filters.disabled,
                    sort: this.filters.sort,
                    sort_state: this.filters.sort_state,
                    type: this.filters.type === 'ALL' ? '' : this.filters.type,
                };
                if (this.filters.reportTimeSelected) {
                    params['start_time'] = this.filters.reportTimeSelected[0] + ':00';
                    let endDate = new Date(this.filters.reportTimeSelected[1] + ':00');
                    endDate.setMinutes(endDate.getMinutes() + 1);
                    params['end_time'] = Util.formatTimeM(endDate);
                }
                this.loading = true;
                API.getDoctors(params)
                    .then(
                        (result) => {
                            if (result) {
                                this.doctorList = result.doctorList;
                                this.total = result.totalCount;
                                this.userOnline = result.userOnline;
                                this.$refs.editorOnlineCount.value = this.userOnline.editorOnlineCount;
                                this.$refs.auditorOnlineCount.value = this.userOnline.auditorOnlineCount;
                                this.$refs.uploaderOnlineCount.value = this.userOnline.uploaderOnlineCount;
                                if (this.setFirstLine) {
                                    this.setCurrent(this.doctorList[0]);
                                }
                                if (typeof callback === 'function') {
                                    callback();
                                }
                            }
                        },
                        (err) => {
                            this.$message.error({
                                showClose: true,
                                message: err.toString(),
                                duration: 2000
                            });
                        }
                    )
                    .finally(() => {
                        this.loading = false;
                    });
            },
            setCurrent(row) {
                this.$refs.usersTable.setCurrentRow(row);
            },
            reset() {
                this.filters = {
                    name: "",
                    reportTimeSelected: '',
                    type: 'ALL',
                    sort: 'LOGIN_STATE',
                    sort_state: 'DOWN',
                    hospital_id: '',
                    disabled: ''
                };
                bus.$emit('resetExpandTree');
                this.$refs.usersTable.clearSort();
                this.handleSearch();
            },
            clearSelectedHospital() {
                this.filters.hospital_id = '';
                this.handleSearch();
            },
            tableSort({column, prop, order}) {
                this.filters.sort = this.sortNameMap[prop] || 'LOGIN_STATE';
                this.filters.sort_state = this.sortOrderMap[order] || 'DOWN';
                this.handleSearch();
            },
            selectedHospital(val) {
                this.filters.hospital_id = val.id;
                this.filters.hospital_label = val.label;
                this.handleSearch();
            },
            getHospitals() {
                this.getHospitalLoading = true;
                API.getInstitutions({
                    showReportCount: false
                }).then(res => {
                    this.treeData = res;
                }).finally(() => {
                    this.getHospitalLoading = false;
                })
            },
            handleCurrentChange(val) {
                this.page = val;
                this.search();
            },
            doctorLoad(row, expandedRows) {
                let temp = this.expands;
                this.expands = [];
                this.expands.push(row.doctorId);
                if (temp.length === 1 && temp[0] === row.doctorId) {     // 收起展开行
                    this.expands = [];
                } else {
                    let params = {
                        doctor_id: row.doctorId
                    };
                    if (this.filters.reportTimeSelected) {
                        params['start_time'] = this.filters.reportTimeSelected[0] + ':00';
                        let endDate = new Date(this.filters.reportTimeSelected[1] + ':00');
                        endDate.setMinutes(endDate.getMinutes() + 1);
                        params['end_time'] = Util.formatTimeM(endDate);
                    }
                    this.getDoctorDetailLoading = true;
                    API.getDoctorDetail(params).then(res => {
                        this.doctorDetail = res;
                    }).finally(() => {
                        this.getDoctorDetailLoading = false;
                    })
                }
            },
            getRowKeys(row) {
                return row.doctorId;
            },
            selectedDoctorHospital(val) {
                this.addDoctorForm.institution_id = val.id;
                this.addDoctorForm.institution_prefix = val.prefix;
            },
            confirmAddDoctor() {
                this.$refs.addDoctorForm.validate((valid) => {
                    if (valid) {
                        if (!this.beforeAvatarUpload(this.addDoctorForm.signature)) {
                            return;
                        }
                        let prefix = this.addDoctorForm.institution_prefix + '-';
                        if (this.addDoctorForm.institution_prefix === 'lj') {
                            prefix = '';
                        }
                        let param = {
                            login_name: prefix + this.addDoctorForm.login_name,
                            nick_name: this.addDoctorForm.nick_name,
                            role: this.addDoctorForm.role,
                            signature: this.addDoctorForm.signature,
                            description: this.addDoctorForm.description
                        };
                        if (this.userType === 4) {
                            param = {
                                institution_id: this.addDoctorForm.institution_id,
                                ...param
                            }
                        }
                        if (this.userType === 4 || this.userType === 2) {
                            axios({
                                url: '/users', method: 'post', headers: {
                                    'Content-Type': 'multipart/form-data'
                                },
                                transformRequest: [function (data) {
                                    let formData = new FormData();
                                    Object.keys(data).forEach(key => formData.append(key, data[key]));
                                    return formData;
                                }],
                                data: param
                            }).then(res => {
                                this.$message({
                                    type: 'success',
                                    message: '添加成功'
                                });
                                this.search();
                                this.addDoctorDialogState = false;
                            });
                        }
                    }
                });
            },
            showAddDoctorDialog() {
                this.addDoctorDialogState = true;
            },
            closeAddDoctorDialog() {
                if (this.userType === 4) {
                    this.$refs.expandTreeAdd.reset();
                }
                this.$refs.addDoctorForm.resetFields();
            },
            editDoctor(row) {
                this.editDoctorForm.doctorId = row.doctorId;
                this.editDoctorForm.institution_prefix = row.doctorHospitalPre;
                this.editDoctorForm.login_name = row.doctorName;
                this.editDoctorForm.nick_name = row.doctorNickName;
                this.editDoctorForm.disabled = row.disabled ? '禁用' : '正常';
                this.editDoctorForm.role = row.userType;
                this.editDoctorForm.description = row.description;
                this.editDoctorForm.signatureUrl = `/users/${this.editDoctorForm.doctorId}/signature?${new Date().getTime()}`;
                this.editDoctorDialogState = true;
            },
            confirmEditDoctor() {
                this.$refs.editDoctorForm.validate((valid) => {
                    if (valid) {
                        if (!this.beforeAvatarUpload(this.editDoctorForm.signature)) {
                            return;
                        }
                        axios({
                            url: '/users/' + this.editDoctorForm.doctorId, method: 'put', headers: {
                                'Content-Type': 'multipart/form-data'
                            },
                            transformRequest: [function (data) {
                                let formData = new FormData();
                                Object.keys(data).forEach(key => formData.append(key, data[key]));
                                return formData;
                            }],
                            data: {
                                description: this.editDoctorForm.description,
                                nick_name: this.editDoctorForm.nick_name,
                                signature: this.editDoctorForm.signature,
                            }
                        }).then((res) => {
                            this.search();
                        }).finally(() => {
                            this.editDoctorDialogState = false;
                        });
                    }
                });
            },
            switchDoctorState(row) {
                this.$confirm('是否确定此操作？', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning'
                }).then(() => {
                    if (row.disabled) {
                        API.enableDoctor({
                            username: row.doctorName
                        }).then(() => {
                            this.search();
                        })
                    } else {
                        API.forbidDoctor({
                            username: row.doctorName
                        }).then((res) => {
                            this.search();
                        });
                    }
                }).catch(() => {

                })
            },
            resetPassword(row) {
                this.$confirm('是否确定此操作？', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning'
                }).then(() => {
                    return APISuperAdmin.resetPwd({
                        doctor_id: row.doctorId
                    })
                }).then(() => {
                    this.$message({
                        message: '重置密码成功',
                        type: 'success'
                    });
                    this.search();
                });
            },
            deleteDoctor(row) {
                this.$confirm('是否确定此操作？', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning'
                }).then(() => {
                    API.deleteDoctor(row.doctorId).then(() => {
                        this.$message({
                            message: '删除成功',
                            type: 'success'
                        });
                        this.search();
                    });
                }).catch(() => {

                });
            },
            //上传签章相关的函数
            beforeAvatarUpload(file) {
                if (file !== null) {
                    const isLt2M = file.size / 1024 / 1024 < 4;
                    let isPng = file.type.indexOf('png') !== -1;
                    if (!isPng) {
                        this.$message.error('上传文件只能是PNG图片!');
                    }
                    if (!isLt2M) {
                        this.$message.error('文件大小不能超过 4MB!');
                    }
                    return isPng && isLt2M;
                } else {
                    return true;
                }
            },
            getAddSignatureFile(file) {
                this.getSignatureFile(file, true);
            },
            getEditSignatureFile(file) {
                this.getSignatureFile(file, false);
            },
            getSignatureFile(file, isAdd) {
                if (isAdd) {
                    this.addDoctorForm.signature = file.raw;
                    this.$refs.addDoctorForm.clearValidate('signature');
                } else {
                    this.editDoctorForm.signature = file.raw;
                    this.editDoctorForm.signatureUrl = '';
                }
            },
            uploadFileLimit() {
                this.$message({
                    type: 'warning',
                    message: '最多只能上传一个签章！'
                })
            },
            removeAddUploadFile() {
                this.addDoctorForm.signature = null;
            },
            removeEditUploadFile() {
                this.editDoctorForm.signature = null;
            },
            closeEditDoctorDialog() {
                this.editDoctorForm.signature = null;
                if (this.$refs.editSignatureUploader) {//只有审核医生才有上传组件，编辑成功后需清空上传文件列表
                    this.$refs.editSignatureUploader.clearFiles();
                }
            }
        },
        mounted() {
            let name = this.$route.params.targetName;
            if (name) {
                this.setFirstLine = true;
                this.filters = {
                    ...this.filters,
                    name: name
                };
            }
            bus.$emit('changeSelectIndex', "3");
            this.handleSearch();
        },
        beforeDestroy() {

        }
    };
</script>
<style>
    .warp .el-dialog__body {
        padding: 0 20px 20px 20px;
    }

    .warp .el-dialog__header {
        padding: 20px 20px 10px;
        border-bottom: 1px solid #ccc;
    }

    .warp .el-table .cell, .el-table--border td:first-child .cell {
        text-align: center;
    }

    .demo-table-expand {
    }

    .demo-table-expand label {
        width: 90px;
        color: #99a9bf;
    }

    .demo-table-expand .el-form-item {
        margin-right: 0;
        margin-bottom: 0;
        width: 200px;
    }
</style>
<style scoped>
    .input-label {
        font-size: 14px;
    }

    .select-common {
        width: 150px;
        margin-right: 10px;
    }

    .circle {
        display: inline-block;
        width: 5px;
        height: 5px;
        border-radius: 50%;
        vertical-align: middle;
    }

    .table-expand {
        display: flex;
    }

    .table-expand > div {
        width: 50%;
    }

    .table-expand-hospital {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
    }

    .table-expand-title {
        margin-bottom: 10px;
        font-weight: bold;
    }

    .table-expand-item {
        margin-bottom: 5px;
    }

    .doctor-manage-box /deep/ .el-table__expanded-cell {
        padding: 10px 50px;
    }

    /deep/ .avatar-uploader .el-upload {
        border: 1px dashed #d9d9d9;
        border-radius: 6px;
        cursor: pointer;
        position: relative;
        overflow: hidden;
    }

    /deep/ .avatar-uploader .el-upload:hover {
        border-color: #409EFF;
    }

    /deep/ .avatar-uploader-icon {
        font-size: 28px;
        color: #8c939d;
        width: 178px;
        height: 178px;
        line-height: 178px;
        text-align: center;
    }

    /deep/ .avatar {
        width: 178px;
        height: 178px;
        display: block;
    }

    .warp /deep/ .el-badge__content.is-fixed {
        top: 8px;
        right: 2px;
    }
</style>
