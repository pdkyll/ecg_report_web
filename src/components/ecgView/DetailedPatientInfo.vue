<template>
    <div class="detailed-patient-info-box">
        <el-dialog
                :visible.sync="dialogVisible"
                :show-close= "showClose"
        >
            <img :src="showImgSrc" style="width: 100%">
        </el-dialog>
        <el-card>
            <div style="display: flex; justify-content: space-around"><el-form  ref="form" :model="form" label-width="100px">
                <el-form-item label="姓名：">
                    <el-input v-model="form.name" disabled style="width: 380px;margin-left: 100px;"></el-input>
                </el-form-item>
                <el-form-item label="性别：">
                    <el-input v-model="form.gender" disabled style="width: 380px;margin-left: 100px;"></el-input>
                </el-form-item>
                <el-form-item label="年龄：">
                    <el-input v-model="form.age" disabled style="width: 380px;margin-left: 100px;"></el-input>
                </el-form-item>
                <el-form-item label="电话：">
                    <el-input v-model="form.cellphone" disabled style="width: 380px;margin-left: 100px;"></el-input>
                </el-form-item>
                <el-form-item label="记录时间：">
                    <el-input v-model="form.recordTime" disabled style="width: 170px;margin-left: 100px;"></el-input>
                    <span style="width: 40px;display: inline-block;text-align: center">-</span>
                    <el-input v-model="form.recordEndTime" disabled style="width: 170px;"></el-input>
                </el-form-item>
                <el-form-item label="设备编号：">
                    <el-input v-model="form.deviceNumber" disabled style="width: 380px;margin-left: 100px;"></el-input>
                </el-form-item>
            </el-form>
                <el-form  ref="form" :model="form" label-width="100px">
                    <el-form-item label="血压：">
                        <el-input v-model="form.bloodPressureHigh" disabled style="width: 170px;margin-left: 100px;"></el-input>
                        <span style="width: 40px;display: inline-block;text-align: center">/</span>
                        <el-input v-model="form.bloodPressure" disabled style="width: 170px;"></el-input>
                    </el-form-item>
                    <el-form-item label="吸烟：">
                        <el-input v-model="form.smoking" disabled style="width: 200px;margin-left: 100px;"></el-input>
                    </el-form-item>
                    <el-form-item label="起搏器：">
                        <el-input v-model="form.paceMaker" disabled style="width: 200px;margin-left: 100px;"></el-input>
                    </el-form-item>
                    <el-form-item label="家庭地址：">
                        <el-input v-model="form.address" disabled style="width: 380px;margin-left: 100px;"></el-input>
                    </el-form-item>
                    <el-form-item label="公司：">
                        <el-input v-model="form.company" disabled style="width: 380px;margin-left: 100px;"></el-input>
                    </el-form-item>
                    <el-form-item label="身份证：">
                        <el-input v-model="form.idNumber" disabled style="width: 380px;margin-left: 100px;"></el-input>
                    </el-form-item>
                </el-form>
            </div>
        </el-card>

        <el-card style="padding-left: 42px">
            <el-form  ref="form" :model="form" label-width="100px">
                <el-form-item label="症状：">
                    <el-input type="textarea" v-model="form.symptom" disabled style="width: 600px;margin-left: 100px;"></el-input>
                </el-form-item>
            </el-form>
            <el-form  ref="form" :model="form" label-width="100px">
                <el-form-item label="病史：">
                    <el-input type="textarea" v-model="form.sickHistory" disabled style="width: 600px;margin-left: 100px;"></el-input>
                </el-form-item>
            </el-form>
            <el-form  ref="form" :model="form" label-width="100px">
                <el-form-item label="用药情况：">
                    <el-input type="textarea" v-model="form.medicalCase" disabled style="width: 600px;margin-left: 100px;"></el-input>
                </el-form-item>
            </el-form>
            <el-form  ref="form" :model="form" label-width="100px">
                <el-form-item label="附件：">
                    <div class="flexBoxDetail">
                        <div v-for="formItem in form.reportAttachmentUrls.picArr" style="width: 280px; height: 280px;overflow: hidden;margin-bottom: 10px">
                            <img :src="formItem" style="width: 100%;max-height: 100%; cursor: pointer" @click="showImg(formItem)">
                        </div>
                    </div>
                    <div v-for="formItem in form.reportAttachmentUrls.otherArr" style="margin-left: 100px">
                        <a :href="formItem" target="_blank">{{formItem}}</a>
                    </div>
                </el-form-item>
            </el-form>
        </el-card>
    </div>
</template>
<script>
    import {mapMutations, mapState} from 'vuex'
    import API from '../../api/api_ecg_view';
    import {bus} from '../../bus';

    export default {
        name: 'DetailedPatientInfo',
        data() {
            return {
                dialogVisible: false,
                showImgSrc: '',
                showClose: false,
                form: {
                    address: "",
                    age: 51,
                    bloodPressure: null,
                    bloodPressureHigh: null,
                    deviceNumber: null,
                    name: "赵华宇",
                    gender: "无",
                    idNumber: null,
                    smoking: "未填",
                    medicalCase: null,
                    paceMaker: "未填",
                    cellphone: null,
                    recordEndTime: "2017-12-23 05:20:00",
                    recordTime: "2017-12-21 21:03:00",
                    reportAttachmentUrls: null,
                    reportCreateAt: null,
                    reportType: null,
                    sickHistory: "123123123123123123123",
                    symptom:  "123123123123123123123",
                    tradeNumber: null,
                    uploaderId: 0,
                    uuid: null,
                    company: '123123123123123',
                }
            }
        },
        methods: {
            ...mapMutations('ecgView', [
                'changeBasicInfo',
                'changeEcgStartTime',
                'changeEcgEndTime'
            ]),
            showImg(src) {
                this.showImgSrc = src;
                this.dialogVisible = true;
            }
        },
        mounted() {
            let picSrc = this.basicInfo.reportAttachmentUrls || [];
            const regImg = /(.*)\.(jpg|bmp|gif|ico|pcx|jpeg|tif|png|raw|tga)$/;
            let picArr = [];
            let otherArr = [];
            picSrc.map(item => {
               let suffix =  item.slice(item.lastIndexOf('.'));
               if (regImg.test(suffix)) {
                   picArr.push(item);
               } else {
                   otherArr.push(item);
               }
            });
            this.form = {
                ...this.basicInfo,
                reportAttachmentUrls: {
                    picArr,
                    otherArr
                }
            };
        },
        computed: {
            ...mapState('ecgView', {
               basicInfo: state => state.basicInfo
            }),
            report_id: function () {
                return localStorage.getItem('report_id');
            }
        }
    }
</script>
<style>
    .detailed-patient-info-box .el-form-item {
        margin-bottom: 20px;
    }
    .detailed-patient-info-box .el-input.is-disabled .el-input__inner {
        color: #000;
        cursor: pointer;
    }
    .detailed-patient-info-box .el-textarea.is-disabled .el-textarea__inner {
        color: #000;
        cursor: pointer;
    }
</style>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
    .flexBoxDetail {
        margin-left: 100px;
        width: 600px;
        display: flex;
        flex-wrap: wrap;
        justify-content: space-around;
    }
    .detailed-patient-info-box {
        width: 1530px;
        margin: auto;
    }

    ul {
        list-style: none;
    }

    ul > li {
        margin-bottom: 10px;
    }

    .patient-item-box {
        margin-bottom: 20px;
        box-shadow: 5px 5px 5px #dddddd;
    }
</style>
