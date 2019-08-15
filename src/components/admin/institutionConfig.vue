<template>
    <div style="width: 600px; margin: 40px auto;box-sizing: border-box; padding: 40px 20px;border: 1px solid #ccc;border-radius: 4px">
        <el-form ref="agentForm" :model="agentForm" label-width="100px" v-loading="formLoading"
                 :rules="rules"
                 v-if="hackResetForm">
            <el-form-item label="医院名称:" prop="name">
                <el-input v-model.trim="agentForm.name" style="width: 400px" placeholder="请输入医院名称"></el-input>
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
                <el-radio v-model="agentForm.report_template" label="DEFAULT" disabled>长程模板</el-radio>
                <el-radio v-model="agentForm.report_template" label="PANZHIHUA" disabled>体检模板</el-radio>
            </el-form-item>
            <el-form-item label="报告标题:" prop="reportTitle">
                <el-input v-model.trim="agentForm.report_title" placeholder="请输入报告标题" style="width: 400px"></el-input>
            </el-form-item>
            <el-form-item label="报告副标题:" prop="reportSubtitle">
                <el-input v-model.trim="agentForm.report_subtitle" placeholder="请输入报告副标题" style="width: 370px"></el-input>
            </el-form-item>
            <el-form-item label="医院标示:" prop="prefix">
                <el-input v-model="agentForm.prefix" style="width: 400px" placeholder="请输入医院标示" disabled></el-input>
            </el-form-item>
            <el-form-item label="管理员账户:" prop="adminAcc">
                <el-input v-model="agentForm.admin_acc" style="width: 400px" placeholder="请输入管理员账户" disabled></el-input>
            </el-form-item>
            <el-form-item label="简介:" props="desc">
                <el-input
                        type="textarea"
                        v-model.trim="agentForm.desc"
                        :autosize="{ minRows: 10, maxRows: 14}"
                        style="width: 400px"
                        placeholder="请输入内容"></el-input>
            </el-form-item>
        </el-form>
        <div style="width: 200px; margin: 0 auto; display: flex;justify-content: space-around">
            <el-button type="primary" @click="createNewInstitution">修改</el-button>
        </div>
    </div>
</template>
<script>
    import axios from 'axios';
    import API from '../../api/api_super_admin';
    import {bus} from '../../bus';
    import {mapMutations} from 'vuex';
    export default {
        name: 'institutionConfig',
        data() {
            return {
                agentForm: {},
                formLoading: false,
                hackResetForm: true,
                hackReset: true,
                inputFile: null,
                hospital_id: null,
                rules: {
                    parent: [{required: true, trigger:'none'}],
                    name: [{required: true, trigger:'none'}],
                    logo: [{required: true, trigger:'none'}],
                    reportTemplate: [{required: true, trigger:'none'}],
                    reportTitle: [{required: true, trigger:'none'}],
                    prefix: [{required: true, trigger:'none'}],
                }
            }
        },
        mounted() {
            this.hospital_id = JSON.parse(localStorage.getItem('access-user')).hospital_id;
            this.getInsititutionList(this.hospital_id);
        },
        methods: {
            ...mapMutations('homeLogoAndTitle', [
                'setLogo',
                'setTitle'
            ]),
            getInputFile(file) {
                this.agentForm.logo = '';
                this.inputFile = file;
                //
            },
            removefile() {
                this.inputFile = null;
                this.agentForm.logo = undefined;
            },
            outOfLimit() {
                this.$message({
                    type: 'warning',
                    message: '最多只能上传一个logo'
                })
            },
            getInsititutionList(id) {
                API.getInsititutionInfo({}, id).then(data => {
                    this.agentForm = data;
                    this.agentForm.admin_pwd = '123456';
                    this.formLoading = false;
                });
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
            setData(reader, file) {
                if (reader.result) {
                    let _base64 = reader.result;
                    let BASE64 = _base64.split(',');
                    file = BASE64[1];
                }
                let regBlank = /\s/g;
                if (this.hospital_id === null) {
                    this.$message.error('请先选择上级医院');
                    return;
                }
                if (this.agentForm.name === undefined || this.agentForm.name === '') {
                    this.$message.error('请输入医院名称');
                    return;
                } else if (regBlank.test(this.agentForm.name)) {
                    this.$message.error('医院名称不能包含空格!');
                    return;
                } else if (this.agentForm.name.length < 3 || this.agentForm.name.length > 25) {
                    this.$message.error('医院名称为3到25个 字符!');
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
                let regSubtitle = /^[\u4e00-\u9fa5a-zA-Z0-9·]+$/;
                if (this.agentForm.report_title === undefined || this.agentForm.report_title === '') {
                    this.$message.error('请输入报告标题');
                    return;
                }  else if (!regSubtitle.test(this.agentForm.report_title)) {
                    this.$message.error('报告标题只能输入中文英文或者数字!!');
                    return;
                } else if (regBlank.test(this.agentForm.report_title)) {
                    this.$message.error('报告标题不能包含空格!');
                    return;
                } else {
                    if (this.agentForm.report_title.length > 25) {
                        this.$message.error('报告标题不可超过25个字符!');
                        return;
                    }
                }
                if (this.agentForm.report_subtitle) {  //报告副标题正则验证
                    if (!regSubtitle.test(this.agentForm.report_subtitle)) {
                        this.$message.error('报告副标题只能输入中文英文或者数字!');
                        return;
                    } else if (this.agentForm.report_subtitle.length > 25) {
                        this.$message.error('报告副标题最多只能输入25个字符!');
                        return;
                    }
                }
                let regWord = /^[a-zA-Z]+$/g;
                if (!this.agentForm.prefix) {
                    this.$message.error('请输入报告标示!');
                    return;
                } else if (regBlank.test(this.agentForm.prefix)) {
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
                let url = '';
                // 添加formdata
                let param = new FormData();
                param.append('desc', this.agentForm.desc || '');
                param.append('auditorIds', auditorIds);
                param.append('editorIds', editorIds);
                param.append('institutionId', this.hospital_id || '');
                param.append('adminAcc', this.agentForm.admin_acc);
                param.append('adminPwd', this.agentForm.admin_pwd);
                param.append('reportSubtitle', this.agentForm.report_subtitle || '');
                this.inputFile ? param.append('logo', this.inputFile.raw) : null;
                this.agentForm.name ? param.append('name', this.agentForm.name) : null;
                this.agentForm.report_template ? param.append('reportTemplate', this.agentForm.report_template || 'DEFAULT') : null;
                this.agentForm.report_title ? param.append('reportTitle', this.agentForm.report_title || '') : null;
                /**
                 * axios接口配置
                 * @type {{headers: {"Content-Type": string}}}
                 */
                const config = {
                    headers: {'Content-Type': 'multipart/form-data'}
                };
                url = '/institutions/' + this.hospital_id;
                axios.put(url, param, config).then(data => {
                    let src = 'data:image/png;base64,';
                    if (this.agentForm.logo) {
                        src += this.agentForm.logo;
                    } else {
                        src += file;
                    }
                    localStorage.setItem('logo', src);
                    localStorage.setItem('title', this.agentForm.name);
                    this.setLogo(src);
                    this.setTitle(this.agentForm.name);
                    this.$message({
                        type: 'success',
                        message: '修改成功'
                    });
                }).catch(error => {
                    if (error.response) {
                        if (error.response.data) {
                            this.$message.error(error.response.data.message || '加载出错');
                        }
                    }
                });
            },
            createNewInstitution() {
                let file = this.agentForm.logo;
                let reader = new FileReader();

                if (this.inputFile !== null) {
                    if (!this.beforeAvatarUpload(this.inputFile.raw)) {
                        return;
                    }
                    reader.onload = () => {
                        this.setData(reader, file)
                    };
                    reader.readAsDataURL(this.inputFile.raw);
                } else {
                    this.setData(reader, file)
                }
            },
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