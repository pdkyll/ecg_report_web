<template>
    <div>
        <EditDoctorDialog :setEditors="setEditors" :setAuditors="setAuditors"/>
        <el-dialog
                :visible.sync="dialogVisible"
                width="520px"
                :show-close="false"
                :before-close="handleClose"
        >
            <el-form ref="agentForm" :model="agentForm" label-width="100px" v-loading="formLoading"
                     :rules="rules"
                     v-if="hackResetForm">
                <el-form-item label="上级医院:" prop="parent">
                    <ExpandTree
                            style="margin-right: 10px"
                            ref="expandTree"
                            v-if="hackResetExpandTree"
                            @selectValue="selectedHospital"
                            :default-value="hospitalName"
                            @focus="getHospitals"
                            @clear="clearHospitalId"
                            :disablState="addState"
                            :hasClearBtn="showState!==2"
                            :forseValue="forseValue"
                            :width="370"
                            :treeData="treeData"
                            :loading="getHospitalLoading"
                    ></ExpandTree>
                </el-form-item>
                <el-form-item label="医院名称:" prop="name">
                    <el-input v-model.trim="agentForm.name" style="width: 370px" placeholder="请输入医院名称"></el-input>
                </el-form-item>
                <el-form-item label="医院logo:" prop="logo">
                    <div>
                        <el-upload
                                v-if="hackReset"
                                class="avatar-uploader"
                                action=""
                                ref="uploaderRef"
                                list-type="picture"
                                :on-change="getInputFile"
                                :accept="'image/png'"
                                :auto-upload="false"
                                :limit="1"
                                :on-exceed="outOfLimit"
                                :before-remove="removefile">
                            <i class="el-icon-plus avatar-uploader-icon"></i>
                        </el-upload>
                        <img v-if="inputFile === null? (agentForm.logo !== null && agentForm.logo !== undefined):false"
                             :src="'data:image/png;base64,'+ agentForm.logo" class="avatar">
                    </div>
                </el-form-item>
                <el-form-item label="报告模板:" prop="reportTemplate">
                    <el-radio v-model="agentForm.report_template" label="DEFAULT" :disabled="showState === 2">长程模板</el-radio>
                    <el-radio v-model="agentForm.report_template" label="PANZHIHUA" :disabled="showState === 2">体检模板</el-radio>
                </el-form-item>
                <el-form-item label="报告标题:" prop="reportTitle">
                    <el-input v-model.trim="agentForm.report_title" placeholder="请输入报告标题" style="width: 370px" ></el-input>
                </el-form-item>
                <el-form-item label="报告副标题:" prop="reportSubtitle">
                    <el-input v-model.trim="agentForm.report_subtitle" placeholder="请输入报告副标题" style="width: 370px"></el-input>
                </el-form-item>
                <el-form-item label="医院标示:" prop="prefix">
                    <el-input v-model.trim="agentForm.prefix" style="width: 370px" placeholder="请输入医院标示"
                              :disabled="showState===2"
                              @input="changeInput"
                    ></el-input>
                </el-form-item>
                <el-form-item label="管理员账户:" prop="adminAcc" v-if="showAdmin ||  showState === 2">
                    <el-input v-model.trim="agentForm.admin_acc" style="width: 370px" placeholder=""
                              disabled></el-input>
                </el-form-item>
                <el-form-item label="账户密码:" prop="adminPwd" v-if="showAdmin ||  showState === 2">
                    <el-input type="password" v-model="agentForm.admin_pwd" style="width: 296px" placeholder="请输入密码"
                              disabled></el-input>
                    <el-button type="primary" style="margin-left: 5px" @click="resetPwd" :disabled="showState !== 2">
                        重置
                    </el-button>
                </el-form-item>
                <el-form-item label="标注医生:" prop="editors">
                    <div class="inputOuter">
                        <el-button @click="openEditDoctorDialog(0)" style="float: left">请选择</el-button>
                        <div style="float: left;width: 280px;min-height: 40px;" v-if="hackResetTags">
                            <el-tag
                                    :key="tag.doctorId || tag.id"
                                    v-for="tag in agentForm.editors"
                                    type="warning"
                                    closable
                                    :disable-transitions="false"
                                    @close="handleCloseTag(tag, 0)">
                                {{tag.doctorName || tag.name}}
                            </el-tag>
                        </div>
                    </div>
                </el-form-item>
                <el-form-item label="审核医生:" prop="auditors">
                    <div class="inputOuter">
                        <el-button @click="openEditDoctorDialog(1)" style="float: left">请选择</el-button>
                        <div style="float: left;width: 280px;min-height: 40px;" v-if="hackResetTags">
                            <el-tag
                                    :key="tag.doctorId || tag.id"
                                    v-for="tag in agentForm.auditors"
                                    type="warning"
                                    closable
                                    :disable-transitions="false"
                                    @close="handleCloseTag(tag, 1)">
                                {{tag.doctorName || tag.name}}
                            </el-tag>
                        </div>
                    </div>
                </el-form-item>

                <el-form-item label="简介:" props="desc">
                    <el-input
                            type="textarea"
                            v-model.trim="agentForm.desc"
                            :autosize="{ minRows: 3, maxRows: 6}"
                            style="width: 370px"
                            placeholder="请输入内容"></el-input>
                </el-form-item>
            </el-form>
            <div style="width: 200px; margin: 0 auto; display: flex;justify-content: space-around">
                <el-button type="primary" @click="createNewInstitution">{{showState === 2?'修改':'新增'}}</el-button>
                <el-button @click="initDialog">取消</el-button>
            </div>
        </el-dialog>
    </div>
</template>
<script>
    import {bus} from '../../bus';
    import API from '../../api/api_super_admin';
    import ExpandTree from '../common/ExpandTree.vue';
    import APIUser from '../../api/api_user';
    import axios from "axios";
    import EditDoctorDialog from './EditDoctorDialog';
    import { mapMutations } from 'vuex';

    export default {
        props: ['searchPage'],
        components: {
            ExpandTree,
            EditDoctorDialog
        },
        data() {
            return {
                dialogVisible: false,
                agentForm: {},
                formLoading: false,
                getHospitalLoading: false,
                treeData: [],
                forseValue: '',
                inputFile: null,
                hackResetExpandTree: true,
                options: [],
                selectOption: [],
                hackReset: true,
                addState: false,
                hackResetForm: true,
                hospital_id: null,
                hospitalName: '',
                showState: 0,
                showAdmin: false,
                hackResetTags: true,
                rules: {
                    parent: [{required: true, trigger:'none'}],
                    name: [{required: true, trigger:'none'}],
                    logo: [{required: true, trigger:'none'}],
                    reportTemplate: [{required: true, trigger:'none'}],
                    reportTitle: [{required: true, trigger:'none'}],
                    prefix: [{required: true, trigger:'none'}],
                },
                fromNowHospital: false
            }
        },
        mounted() {
            bus.$off('openAddNewHospitalDialog');
            bus.$on('openAddNewHospitalDialog', (parms) => {
                this.addState = parms.state;
                this.showState = parms.toState;
                this.fromNowHospital = parms.fromNowHospital;
                if (parms.name) {
                    this.forseValue = parms.name;
                }
                if (parms.id) {
                    this.formLoading = true;
                    this.hospital_id = parms.id;
                    this.getInsititutionList(parms.id)
                }
                if (this.showState === 0 || this.showState === 1) {
                    this.agentForm = {};
                    this.showAdmin = false;
                    this.hackResetForm = false;
                    this.$nextTick(() => {
                        this.hackResetForm = true;
                    })
                }
                this.handleOpen();
            })
        },
        methods: {
            ...mapMutations('homeLogoAndTitle',
                [
                    'setLogo',
                    'setTitle'
                ]
            ),
            /**
             * 引入选择上级医院模块
             * @param val
             */
            clearHospitalId() {
                this.hospital_id = null;
            },
            selectedHospital(val) {
                this.hospital_id = val.id;
                this.hospitalName = val.label;
                // this.handleSearch();
            },
            getInsititutionList(id) {
                API.getInsititutionInfo({}, id).then(data => {
                    if (this.showState === 1 || this.showState === 0) {
                        data.logo = null;
                        data.prefix = '';
                        data.name = '';
                        data.desc = '';
                        data.admin_pwd = '';
                        data.admin_acc = '';
                        data.auditors = [];
                        data.editors = [];
                        data.report_template = '';
                        data.report_title = '';
                        data.report_subtitle = '';
                    }
                    if (this.showState === 2) {
                        this.forseValue = data.parent_name;
                        // this.hospital_id = data.parent_id;
                    }
                    this.agentForm = data;
                    this.agentForm.admin_pwd = '123456';
                    this.hackResetExpandTree = false;
                    this.$nextTick(() => {
                        this.hackResetExpandTree = true;
                        this.formLoading = false;
                    })
                });
            },
            getHospitals() {
                this.getHospitalLoading = true;
                APIUser.getInstitutions().then(res => {
                    this.treeData = res;
                }).finally(() => {
                    this.getHospitalLoading = false;
                })
            },
            /**
             * 其他原有模块
             * @param res
             * @param file
             */
            changeInput(val) {

                if (val.length) {
                    this.showAdmin = true;
                    this.agentForm = {
                        ...this.agentForm,
                        admin_acc: val + '-admin',
                        admin_pwd: '123456'
                    }
                } else {
                    this.showAdmin = false;
                }
            },
            resetPwd() {
                this.$confirm('是否重置初始密码为123456?', '', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning',
                    callback: action => {
                        if (action === 'confirm') {
                            API.resetPwd({
                                doctor_id: this.agentForm.admin_id
                            }).then(_ => {
                                this.agentForm = {
                                    ...this.agentForm,
                                    adminPwd: '123456'
                                };
                                this.$message({
                                    type: 'success',
                                    message: '重置成功!'
                                })
                            })
                        }
                    }
                });
            },
            initDialog() {
                this.agentForm = {};
                this.dialogVisible = false;
            },
            getInputFile(file) {
                this.agentForm.logo = '';
                this.inputFile = file;
                //
            },
            handleCloseTag(tag, type) {
                if (type === 0) {
                    this.agentForm.editors.splice(this.agentForm.editors.indexOf(tag), 1);
                } else {
                    this.agentForm.auditors.splice(this.agentForm.auditors.indexOf(tag), 1);
                }
                this.hackResetTags = false;
                this.$nextTick(() => {
                    this.hackResetTags = true;
                })
            },
            removefile() {
                this.inputFile = null;
                this.agentForm.logo = undefined;
            },
            beforeAvatarUpload(file) {
                const isLt2M = file.size / 1024 / 1024 < 4;
                let isPng = file.type.indexOf('png') !== -1;
                if (!isPng) {
                    this.$message.error('上传文件只能是PNG图片!');
                }
                if (!isLt2M) {
                    this.$message.error('上传医院logo图片大小不能超过 4MB!');
                }
                return isPng && isLt2M;
            },
            handleOpen() {
                this.dialogVisible = true;
            },
            handleClose() {
                this.agentForm = {};
                this.hackResetForm = false;
                this.inputFile = null;
                this.hospitalName = '';
                this.forseValue = '';
                this.$nextTick(() => {
                    this.hackResetForm = true;
                    this.dialogVisible = false;
                    bus.$emit('clearTags');
                });
            },
            openEditDoctorDialog(val) {
                let sendObj = {};
                if (val === 0) {
                    sendObj = {
                        type: 0,
                        tags: this.agentForm.editors
                    }
                } else {
                    sendObj = {
                        type: 1,
                        tags: this.agentForm.auditors
                    }
                }
                bus.$emit('openEditDoctorDialog', sendObj);
            },
            createNewInstitution() {
                let file = this.agentForm.logo;
                if (this.inputFile !== null) {
                    file = this.inputFile.raw;
                    if (!this.beforeAvatarUpload(file)) {
                        return;
                    }
                }
                this.$message.closeAll();
                let regBlank = /^[\u4e00-\u9fa5_a-zA-Z0-9_\-]{1,25}$/;
                if (this.hospital_id === null) {
                    this.$message.error('请先选择上级医院');
                    return;
                }
                if (this.agentForm.name === undefined || this.agentForm.name === '') {
                    this.$message.error('请输入医院名称');
                    return;
                } else if (!regBlank.test(this.agentForm.name)) {
                    this.$message.error('医院名称只能输入中文、英文、数字及"_"和"-",且最多输入25个字符!');
                    return;
                }
                if (!this.agentForm.logo) {
                    if (this.inputFile === null) {
                        this.$message.error('请选择医院logo');
                        return;
                    }
                }
                if (this.agentForm.report_template === undefined || this.agentForm.report_template === '') {
                    this.$message.error('请选择报告模板');
                    return;
                }
                let regSubtitle = /^[\u4e00-\u9fa5_a-zA-Z0-9_\-·]{1,25}$/;
                if (this.agentForm.report_title === undefined || this.agentForm.report_title === '') {
                    this.$message.error('请输入报告标题');
                    return;
                }  else if (!regSubtitle.test(this.agentForm.report_title)) {
                    this.$message.error('报告标题只能输入中文、英文、数字及"_"及"-"和"·",且最多输入25个字符!');
                    return;
                }

                if (this.agentForm.report_subtitle) {  //报告副标题正则验证
                    if (!regSubtitle.test(this.agentForm.report_subtitle)) {
                        this.$message.error('报告副标题只能输入中文、英文、数字及"_"及"-"和"·",且最多输入25个字符!');
                        return;
                    }
                }
                let regWord = /^[a-zA-Z]+$/g;
                let regBlankOther = /\s/g;
                if (!this.agentForm.prefix) {
                    this.$message.error('请输入报告标示!');
                    return;
                } else if (regBlankOther.test(this.agentForm.prefix)) {
                    this.$message.error('医院标示不能包含空格!');
                    return;
                } else if (!regWord.test(this.agentForm.prefix)) {
                    this.$message.error('医院标示只能包含字母!');
                    return;
                } else if (this.agentForm.prefix.length < 1 || this.agentForm.prefix.length > 25) {
                    this.$message.error('医院标示为1到25个 字符!');
                    return;
                }
                if (this.agentForm.desc) {
                    if (this.agentForm.desc.length > 200) {
                        this.$message.error('报告简介不可超过200个字符!');
                        return;
                    }
                }
                let url = '';
                // 添加formdata
                let param = new FormData();
                let auditorIds = [];
                let editorIds = [];
                if (this.agentForm.auditors) {
                    this.agentForm.auditors.map(item => {
                        if (item.id) {
                            auditorIds.push(item.id);
                        } else {
                            auditorIds.push(item.doctorId);
                        }
                    });
                }
                if (this.agentForm.editors) {
                    this.agentForm.editors.map(item => {
                        if (item.id) {
                            editorIds.push(item.id);
                        } else {
                            editorIds.push(item.doctorId);
                        }
                    });
                }
                switch (this.showState) {
                    case 0:
                    case 1:
                        param.append('auditorIds', auditorIds);
                        param.append('editorIds', editorIds);
                        param.append('desc', this.agentForm.desc || '');
                        param.append('logo', file);
                        param.append('name', this.agentForm.name);
                        param.append('parentId', this.hospital_id);
                        param.append('prefix', this.agentForm.prefix);
                        param.append('adminAcc', this.agentForm.admin_acc);
                        param.append('adminPwd', this.agentForm.admin_pwd);
                        param.append('reportTemplate', this.agentForm.report_template || 'DEFAULT');
                        param.append('reportTitle', this.agentForm.report_title || 'default');
                        param.append('reportSubtitle', this.agentForm.report_subtitle || '');
                        break;
                    case 2:
                        param.append('auditorIds', auditorIds);
                        param.append('editorIds', editorIds);
                        param.append('desc', this.agentForm.desc || '');
                        param.append('institutionId', this.hospital_id || '');
                        param.append('adminAcc', this.agentForm.admin_acc);
                        param.append('adminPwd', this.agentForm.admin_pwd);
                        param.append('reportSubtitle', this.agentForm.report_subtitle || '');
                        this.inputFile ? param.append('logo', file) : null;
                        this.agentForm.name ? param.append('name', this.agentForm.name) : null;
                        this.agentForm.report_template ? param.append('reportTemplate', this.agentForm.report_template || 'DEFAULT') : null;
                        this.agentForm.report_title ? param.append('reportTitle', this.agentForm.report_title || 'default') : null;
                        break;
                    default:
                        break;

                }
                const config = {
                    headers: {'Content-Type': 'multipart/form-data'}
                };

                if (this.showState === 0 || this.showState === 1) {
                    url = '/institutions';
                    axios.post(url, param, config).then(data => {
                        this.$message({
                            type: 'success',
                            message: '新增成功'
                        });
                        this.dialogVisible = false;
                        this.searchPage();
                    }).catch(error => {
                        if (error.response) {
                            if (error.response.data) {
                                this.$message.error(error.response.data.message || '加载出错');
                            }
                        }
                    });
                } else {
                    url = '/institutions/' + this.hospital_id;
                    let message = '新增成功';
                    if (this.showState === 2) message = '修改成功';
                    axios.put(url, param, config).then(data => {
                        this.$message({
                            type: 'success',
                            message: message
                        });
                        if (this.inputFile !== null) {
                            this.readFileToBase64(this.inputFile);
                        } else {
                            if (this.fromNowHospital) {
                                localStorage.setItem('logo', 'data:image/png;base64,' + this.agentForm.logo);
                                this.setLogo('data:image/png;base64,' + this.agentForm.logo);
                            }
                        }
                        if (this.fromNowHospital) {
                            localStorage.setItem('title', this.agentForm.name);
                            this.setTitle(this.agentForm.name);
                        }
                        this.dialogVisible = false;
                        this.searchPage();
                    }).catch(error => {
                        if (error.response) {
                            if (error.response.data) {
                                this.$message.error(error.response.data.message || '加载出错');
                            }
                        }
                    });
                }
            },
            readFileToBase64(file) {
                let title = localStorage.getItem('title');
                if (title === this.agentForm.name) {
                    let reader = new FileReader();
                    reader.onload = () => {
                        if (reader.result) {
                            let _base64 = reader.result;
                            let BASE64 = _base64.split(',');
                            file = BASE64[1];
                        }
                        let src = 'data:image/png;base64,';
                        if (this.agentForm.logo) {
                            src += this.agentForm.logo;
                        } else {
                            src += file;
                        }
                        if (this.fromNowHospital) {
                            localStorage.setItem('logo', src);
                            this.setLogo(src);
                        }
                    };
                    reader.readAsDataURL(this.inputFile.raw);
                }
            },
            setEditors(val) {
                this.agentForm = {
                    ...this.agentForm,
                    editors: val
                };
                this.hackResetTags = false;
                this.$nextTick(() => {
                    this.hackResetTags = true;
                })
            },
            setAuditors(val) {
                this.agentForm.auditors = val;
                this.hackResetTags = false;
                this.$nextTick(() => {
                    this.hackResetTags = true;
                })
            },
            outOfLimit() {
                this.$message({
                    type: 'warning',
                    message: '最多只能上传一个logo'
                })
            }
        }
    }
</script>
<style scoped>
    .avatar-uploader-icon {
        font-size: 28px;
        color: #8c939d;
        width: 128px;
        height: 128px;
        line-height: 128px;
        border: 1px dashed #ccc;
        text-align: center;
    }

    .avatar-uploader {
        display: inline-block;
        vertical-align: top;
        margin-right: 10px;
    }

    .avatar {
        width: 128px;
        height: 128px;
    }

    .inputOuter {
        position: relative;
        width: 370px;
        overflow: hidden;
        border-radius: 5px;
        border: 1px solid #dcdfe6;
    }
</style>