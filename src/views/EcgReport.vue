<template>
    <div class="outer">
        <div class="infoBox">
            <div class="leftBox" style="margin-right: 30px">
                <div class="tongjiBox" v-loading="loading">
                    <h5 class="title">统计信息</h5>
                    <div class="flexNormal">
                        <div class="formBox">
                            <!--心率-->
                            <fieldset class="fileset1">
                                <legend>心率</legend>
                                <div class="flexColumn block1" style="width: 220px; ">
                                    <div class="flexBox">
                                        <span>最慢：</span>
                                        <input type="number"
                                               :class="editorCss('heart_rate.min_heart_rate')"
                                               data-key="heart_rate.min_heart_rate"
                                               v-model.trim="recordInfo.heart_rate.min_heart_rate"
                                               @input="changeItem($event)"
                                        />
                                        <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                             v-if="renderIcon('heart_rate.min_heart_rate')"
                                             @click="handleChangeType('heart_rate.min_heart_rate')">
                                    </div>
                                    <div class="flexBox">
                                        <span>发生时间：</span>
                                        <input type="text" :class="editorCss('heart_rate.min_heart_rate_date_time')"
                                               data-key="heart_rate.min_heart_rate_date_time"
                                               v-model.trim="recordInfo.heart_rate.min_heart_rate_date_time"
                                               @input="changeItem($event)"/>
                                        <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                             v-if="renderIcon('heart_rate.min_heart_rate_date_time')"
                                             @click="handleChangeType('heart_rate.min_heart_rate_date_time')">
                                    </div>
                                    <div class="flexBox">
                                        <span>最快：</span>
                                        <input type="number" v-model.trim="recordInfo.heart_rate.max_heart_rate"
                                               :class="editorCss('heart_rate.max_heart_rate')"
                                               data-key="heart_rate.max_heart_rate"
                                               @input="changeItem($event)"/>
                                        <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                             v-if="renderIcon('heart_rate.max_heart_rate')"
                                             @click="handleChangeType('heart_rate.max_heart_rate')">
                                    </div>
                                    <div class="flexBox">
                                        <span>发生时间：</span>
                                        <input type="text" v-model.trim="recordInfo.heart_rate.max_heart_rate_date_time"
                                               :class="editorCss('heart_rate.max_heart_rate_date_time')"
                                               data-key="heart_rate.max_heart_rate_date_time"
                                               @input="changeItem($event)"/>
                                        <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                             v-if="renderIcon('heart_rate.max_heart_rate_date_time')"
                                             @click="handleChangeType('heart_rate.max_heart_rate_date_time')">
                                    </div>
                                    <div class="flexBox">
                                        <span>平均：</span>
                                        <input type="number" v-model.trim="recordInfo.heart_rate.avg_heart_rate"
                                               :class="editorCss('heart_rate.avg_heart_rate')"
                                               data-key="heart_rate.avg_heart_rate"
                                               @input="changeItem($event)"/>
                                        <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                             v-if="renderIcon('heart_rate.avg_heart_rate')"
                                             @click="handleChangeType('heart_rate.avg_heart_rate')">
                                    </div>
                                    <div class="flexBox">
                                        <span>心动过速事件：</span>
                                        <input type="number" @input="changeItem($event)"
                                               :class="editorCss('heart_rate.over_speed_count')"
                                               data-key="heart_rate.over_speed_count"
                                               v-model.trim="recordInfo.heart_rate.over_speed_count"/>
                                        <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                             v-if="renderIcon('heart_rate.over_speed_count')"
                                             @click="handleChangeType('heart_rate.over_speed_count')">
                                    </div>
                                    <div class="flexBox">
                                        <span>总时长：</span>
                                        <input type="text" @input="changeItem($event)"
                                               :class="editorCss('heart_rate.over_speed_seconds')"
                                               data-key="heart_rate.over_speed_seconds"
                                               v-model.trim="recordInfo.heart_rate.over_speed_seconds"/>
                                        <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                             v-if="renderIcon('heart_rate.over_speed_seconds')"
                                             @click="handleChangeType('heart_rate.over_speed_seconds')">
                                    </div>
                                    <div class="flexBox">
                                        <span>心动过缓事件：</span>
                                        <input type="number" @input="changeItem($event)"
                                               :class="editorCss('heart_rate.slow_down_count')"
                                               data-key="heart_rate.slow_down_count"
                                               v-model.trim="recordInfo.heart_rate.slow_down_count"/>
                                        <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                             v-if="renderIcon('heart_rate.slow_down_count')"
                                             @click="handleChangeType('heart_rate.slow_down_count')">
                                    </div>
                                    <div class="flexBox">
                                        <span>总时长：</span>
                                        <input type="text" @input="changeItem($event)"
                                               :class="editorCss('heart_rate.slow_down_seconds')"
                                               data-key="heart_rate.slow_down_seconds"
                                               v-model.trim="recordInfo.heart_rate.slow_down_seconds"/>
                                        <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                             v-if="renderIcon('heart_rate.slow_down_seconds')"
                                             @click="handleChangeType('heart_rate.slow_down_seconds')">
                                    </div>
                                </div>

                            </fieldset>
                            <!--室性早搏-->
                            <fieldset>
                                <legend>房性早搏</legend>
                                <div class="flexColumn block2" style="width: 190px">
                                    <div class="flexBox">
                                        <span>单发：</span><input type="number"
                                                               v-model.trim="recordInfo.apb.S"
                                                               data-key="apb.S"
                                                               :class="editorCss('apb.S')"
                                                               @input="changeItem($event)"/>
                                        <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                             v-if="renderIcon('apb.S')" @click="handleChangeType('apb.S')">
                                    </div>
                                    <div class="flexBox">
                                        <span>成对：</span>
                                        <input type="number" data-key="apb.SC" :class="editorCss('apb.SC')"
                                               v-model.trim="recordInfo.apb.SC" @input="changeItem($event)"/>
                                        <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                             v-if="renderIcon('apb.SC')" @click="handleChangeType('apb.SC')">
                                    </div>
                                    <div class="flexBox">
                                        <span>二联律：</span>
                                        <input type="number" v-model.trim="recordInfo.apb.SBGM"
                                               :class="editorCss('apb.SBGM')" @input="changeItem($event)"
                                               data-key="apb.SBGM"/>
                                        <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                             v-if="renderIcon('apb.SBGM')" @click="handleChangeType('apb.SBGM')">
                                    </div>
                                    <div class="flexBox">
                                        <span>三联律：</span>
                                        <input type="number" v-model.trim="recordInfo.apb.STGM"
                                               :class="editorCss('apb.STGM')" @input="changeItem($event)"
                                               data-key="apb.STGM"/>
                                        <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                             v-if="renderIcon('apb.STGM')" @click="handleChangeType('apb.STGM')">
                                    </div>
                                    <div class="flexBox">
                                        <span>短阵房速：</span>
                                        <input type="number" v-model.trim="recordInfo.apb.STAC"
                                               :class="editorCss('apb.STAC')" @input="changeItem($event)"
                                               data-key="apb.STAC"/>
                                        <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                             v-if="renderIcon('apb.STAC')" @click="handleChangeType('apb.STAC')">
                                    </div>
                                    <div class="flexBox">
                                        <span>房颤：</span>
                                        <input type="number" v-model.trim="recordInfo.apb.AF"
                                               :class="editorCss('apb.AF')" @input="changeItem($event)"
                                               data-key="apb.AF"/>
                                        <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                             v-if="renderIcon('apb.AF')" @click="handleChangeType('apb.AF')">
                                    </div>
                                </div>
                            </fieldset>
                            <!--室上性早搏-->
                            <fieldset>
                                <legend>室性早搏</legend>
                                <div class="flexColumn block2" style="width: 180px">
                                    <div class="flexBox">
                                        <span>单发：</span><input type="number" v-model.trim="recordInfo.pvc.V"
                                                               @input="changeItem($event)" data-key="pvc.V"
                                                               :class="editorCss('pvc.V')"/>
                                        <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                             v-if="renderIcon('pvc.V')" @click="handleChangeType('pvc.V')">
                                    </div>
                                    <div class="flexBox">
                                        <span>成对：</span>
                                        <input type="number" v-model.trim="recordInfo.pvc.VC"
                                               @input="changeItem($event)" data-key="pvc.VC"
                                               :class="editorCss('pvc.VC')"/>
                                        <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                             v-if="renderIcon('pvc.VC')" @click="handleChangeType('pvc.VC')">
                                    </div>
                                    <div class="flexBox">
                                        <span>二联律：</span>
                                        <input type="number" v-model.trim="recordInfo.pvc.BGM"
                                               @input="changeItem($event)" data-key="pvc.BGM"
                                               :class="editorCss('pvc.BGM')"/>
                                        <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                             v-if="renderIcon('pvc.BGM')" @click="handleChangeType('pvc.BGM')">
                                    </div>
                                    <div class="flexBox">
                                        <span>三联律：</span>
                                        <input type="number" v-model.trim="recordInfo.pvc.TGM"
                                               @input="changeItem($event)" data-key="pvc.TGM"
                                               :class="editorCss('pvc.TGM')"/>
                                        <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                             v-if="renderIcon('pvc.TGM')" @click="handleChangeType('pvc.TGM')">
                                    </div>
                                    <div class="flexBox">
                                        <span>短阵室速：</span>
                                        <input type="number" v-model.trim="recordInfo.pvc.VTAC"
                                               @input="changeItem($event)" data-key="pvc.VTAC"
                                               :class="editorCss('pvc.VTAC')"/>
                                        <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                             v-if="renderIcon('pvc.VTAC')" @click="handleChangeType('pvc.VTAC')">
                                    </div>
                                    <div class="flexBox">
                                        <span>室颤：</span>
                                        <input type="number" v-model.trim="recordInfo.pvc.VF"
                                               @input="changeItem($event)" data-key="pvc.VF"
                                               :class="editorCss('pvc.VF')"/>
                                        <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                             v-if="renderIcon('pvc.VF')" @click="handleChangeType('pvc.VF')">
                                    </div>
                                </div>
                            </fieldset>
                            <div>
                                <!--长间歇-->
                                <fieldset style="height: 140px;margin-bottom: 0">
                                    <legend>长间歇</legend>
                                    <div class="flexColumn block4" style="width: 230px;">
                                        <div class="flexBox">
                                            <span>R-R间期大于1.5s的心博数：</span>
                                            <input type="number" v-model.trim="recordInfo.lrr.long_r_r_count"
                                                   @input="changeItem($event)" data-key="lrr.long_r_r_count"
                                                   :class="editorCss('lrr.long_r_r_count')"/>
                                            <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                                 v-if="renderIcon('lrr.long_r_r_count')"
                                                 @click="handleChangeType('lrr.long_r_r_count')">
                                        </div>
                                        <div class="flexBox">
                                            <span>最长R-R间期(ms)：</span>
                                            <input type="number" v-model.trim="recordInfo.lrr.max_r_r_duration"
                                                   @input="changeItem($event)" data-key="lrr.max_r_r_duration"
                                                   :class="editorCss('lrr.max_r_r_duration')"/>
                                            <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                                 v-if="renderIcon('lrr.max_r_r_duration')"
                                                 @click="handleChangeType('lrr.max_r_r_duration')">
                                        </div>
                                        <div class="flexBox">
                                            <span>发生时间：</span>
                                            <input type="text" v-model.trim="recordInfo.lrr.max_r_r_datetime"
                                                   @input="changeItem($event)" data-key="lrr.max_r_r_datetime"
                                                   :class="editorCss('lrr.max_r_r_datetime')"/>
                                            <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                                 v-if="renderIcon('lrr.max_r_r_datetime')"
                                                 @click="handleChangeType('lrr.max_r_r_datetime')">
                                        </div>
                                    </div>
                                </fieldset>
                                <!--交界性-->
                                <fieldset style="height: 120px;">
                                    <legend>交界性</legend>
                                    <div class="flexColumn block4" style="width: 230px">
                                        <div class="flexBox">
                                            <span>交界性早搏：</span>
                                            <input type="number" @input="changeItem($event)"
                                                   v-model.trim="recordInfo.borderline.premature_beat"
                                                   data-key="borderline.premature_beat"
                                                   :class="editorCss('borderline.premature_beat')"/>
                                            <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                                 v-if="renderIcon('borderline.premature_beat')"
                                                 @click="handleChangeType('borderline.premature_beat')">
                                        </div>
                                        <div class="flexBox">
                                            <span>交界性逸搏：</span>
                                            <input type="number" @input="changeItem($event)"
                                                   v-model.trim="recordInfo.borderline.fugacity"
                                                   data-key="borderline.fugacity"
                                                   :class="editorCss('borderline.fugacity')"/>
                                            <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                                 v-if="renderIcon('borderline.fugacity')"
                                                 @click="handleChangeType('borderline.fugacity')">
                                        </div>
                                    </div>
                                </fieldset>
                            </div>

                            <!--心率变异性[频域]-->
                            <fieldset>
                                <legend>心率变异性[频域]</legend>
                                <div class="flexColumn noFlex block5" style="height: 240px;width: 180px;">
                                    <div class="flexBox morePadding">
                                        <span>总功率：</span><input type="number" v-model.trim="recordInfo.hrv.gross_power"
                                                                @input="changeItem($event)" data-key="hrv.gross_power"
                                                                :class="editorCss('hrv.gross_power')"/>
                                        <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                             v-if="renderIcon('hrv.gross_power')"
                                             @click="handleChangeType('hrv.gross_power')">
                                    </div>
                                    <div class="flexBox morePadding">
                                        <span>VLF：</span>
                                        <input type="number" @input="changeItem($event)"
                                               v-model.trim="recordInfo.hrv.VLF" data-key="hrv.VLF"
                                               :class="editorCss('hrv.VLF')"/>
                                        <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                             v-if="renderIcon('hrv.VLF')" @click="handleChangeType('hrv.VLF')">
                                    </div>
                                    <div class="flexBox morePadding">
                                        <span>LF：</span>
                                        <input type="number" @input="changeItem($event)"
                                               v-model.trim="recordInfo.hrv.LF" data-key="hrv.LF"
                                               :class="editorCss('hrv.LF')"/>
                                        <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                             v-if="renderIcon('hrv.LF')" @click="handleChangeType('hrv.LF')">
                                    </div>
                                    <div class="flexBox morePadding">
                                        <span>HF：</span>
                                        <input type="number" @input="changeItem($event)"
                                               v-model.trim="recordInfo.hrv.HF" data-key="hrv.HF"
                                               :class="editorCss('hrv.HF')"/>
                                        <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                             v-if="renderIcon('hrv.HF')" @click="handleChangeType('hrv.HF')">
                                    </div>
                                    <div class="flexBox morePadding">
                                        <span>LF/HF：</span>
                                        <input type="number" @input="changeItem($event)"
                                               v-model.trim="recordInfo.hrv.LF_HF" data-key="hrv.LF_HF"
                                               :class="editorCss('hrv.LF_HF')"/>
                                        <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                             v-if="renderIcon('hrv.LF_HF')" @click="handleChangeType('hrv.LF_HF')">
                                    </div>
                                </div>
                            </fieldset>
                            <!--心率变异性[时域]-->
                            <fieldset>
                                <legend>心率变异性[时域]</legend>
                                <div class="flexColumn noFlex block6" style="height: 240px;width: 180px;">
                                    <div class="flexBox morePadding">
                                        <span>SDNN：</span><input type="number" @input="changeItem($event)"
                                                                 v-model.trim="recordInfo.hrv.SDNN" data-key="hrv.SDNN"
                                                                 :class="editorCss('hrv.SDNN')"/>
                                        <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                             v-if="renderIcon('hrv.SDNN')" @click="handleChangeType('hrv.SDNN')">
                                    </div>
                                    <div class="flexBox morePadding">
                                        <span>SDANN：</span>
                                        <input type="number" @input="changeItem($event)"
                                               v-model.trim="recordInfo.hrv.SDANN" data-key="hrv.SDANN"
                                               :class="editorCss('hrv.SDANN')"/>
                                        <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                             v-if="renderIcon('hrv.SDANN')" @click="handleChangeType('hrv.SDANN')">
                                    </div>
                                    <div class="flexBox morePadding">
                                        <span>rMSSD：</span>
                                        <input type="number" @input="changeItem($event)"
                                               v-model.trim="recordInfo.hrv.rMSSD" data-key="hrv.rMSSD"
                                               :class="editorCss('hrv.rMSSD')"/>
                                        <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                             v-if="renderIcon('hrv.rMSSD')" @click="handleChangeType('hrv.rMSSD')">
                                    </div>
                                    <div class="flexBox morePadding">
                                        <span>PNN50：</span>
                                        <input type="number" @input="changeItem($event)"
                                               v-model.trim="recordInfo.hrv.PNN50" data-key="hrv.PNN50"
                                               :class="editorCss('hrv.PNN50')"/>
                                        <img src="../assets/images/change_icon.png" class="change_icon" alt=""
                                             v-if="renderIcon('hrv.PNN50')" @click="handleChangeType('hrv.PNN50')">
                                    </div>
                                </div>
                            </fieldset>
                            <!--医师鉴定-->
                            <div class="doctorSay">
                                <p><span>医师鉴定：</span><img src="../assets/images/change_icon.png" class="change_icon"
                                                          alt="" v-if="renderIcon('result')"
                                                          @click="handleChangeType('result')"></p>
                                <textarea class="docWords" v-model.trim="recordInfo.result" @input="changeItem($event)"
                                          data-key="result"
                                          @keydown.enter="ifCanEnter($event)"
                                          :class="editorCss('result')"
                                ></textarea>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <!--<div class="showPdf" v-loading="iframeLoading">-->
            <!--<iframe id="myPdf" :src="iframeSrc" frameborder="0"-->
            <!--width="100%" height="770"></iframe>-->
            <!--&lt;!&ndash;<pdf src="http://cn.createpdfonline.org/pdffiles/demo(20180910175326).pdf"></pdf>&ndash;&gt;-->
            <!--</div>-->
        </div>

        <div style="position: relative;overflow: hidden;">
            <div class="leftBox">
                <ReportPicture/>
            </div>
        </div>


    </div>
</template>
<script>
    import ReportPicture from "../components/ReportPicture.vue";
    import EcgPart from '../components/EcgPart.vue';
    //    import {deepObjectMerge} from '../assets/js/commonFunc'
    import {bus} from '../bus';
    import API from '../api/api_report';
    import axios from 'axios';

    export default {
        name: 'ecgReport',
        components: {
            ReportPicture,
            EcgPart
        },
        data() {
            return {
                recordInfo_data: {},

                dialogEcgVisible: false,
                timer: null,
                loading: false,
                pdfWord: true,
                addDoctorFormResult: '',
                iframeLoading: false,
                recordInfo: {
                    apb: {
                        AF: 0,
                        S: 0,
                        SBGM: 0,
                        SC: 0,
                        STAC: 0,
                        STGM: 0,
                        S_COUNT: 0
                    },
                    heart_rate: {
                        avg_heart_rate: 0,
                        max_heart_rate_date_time: '',
                        max_heart_rate: 0,
                        min_heart_rate_date_time: '',
                        min_heart_rate: 0,
                        over_speed_count: 0,
                        over_speed_seconds: '',
                        slow_down_count: 0,
                        slow_down_seconds: ''
                    },
                    lrr: {
                        long_r_r_count: 0,
                        max_r_r_datetime: '',
                        max_r_r_duration: 0
                    },
                    pvc: {
                        BGM: 0,
                        TGM: 0,
                        V: 0,
                        VC: 0,
                        VF: 0,
                        VTAC: 0,
                        V_COUNT: 0
                    },
                    hrv: {
                        gross_power: 0,
                        VLF: 0,
                        LF: 0,
                        HF: 0,
                        LF_HF: 0,
                        PNN50: 0,
                        SDNN: 0,
                        rMSSD: 0,
                        SDANN: 0
                    },
                    borderline: {
                        fugacity: 0,
                        premature_beat: 0
                    },
                    result: ''
                },
                userJson: {},
                tempInfo: {},
                recordInfoForReset: {},
                tempInfoForReset: {},
                // 更新点击预览的心电片段

                latestResultValue: '',
            }
        },
        created() {
            this.getRecordInfo();
            bus.$off('getRecordInfo');
            bus.$on('getRecordInfo', () => {
                this.getRecordInfo();
            });
            // bus.$off('getReportData');
            // bus.$on('getReportData', (val) => {
            //     this.showEcgPart = true;
            //     this.label = val.label;
            //     this.type = val.type;
            //     this.partTime = val.time;
            //     this.position = val.position;
            // });
        },
        mounted() {
//            let iframe = document.getElementById('myPdf');
            this.iframeLoading = true;
        },
        computed: {
            report_id() {
                return localStorage.getItem('report_id');
            },
            iframeSrc() {
                return window.location.protocol + '//' + window.location.hostname + '/pdf/generate/?report_id=' + this.report_id;
//                return  'http://192.168.1.159:8080/pdf/generate/?report_id=' + this.report_id;
            }
        },
        methods: {
            getData(key, replace) { // false表示把计算值改成人工值 true表示把人工值改成计算值
                let mainKey = key.split('.')[0], secondKey = key.split('.')[1];
                if (secondKey) {
                    if (replace) {
                        this.recordInfo[mainKey][secondKey] = this.tempInfo.user_json[mainKey][secondKey]
                    } else {
                        this.recordInfo[mainKey][secondKey] = this.tempInfo[mainKey][secondKey]
                    }
                    this.recordInfo[mainKey][`${secondKey}_disabled`] = !replace;
                    this.userJson[mainKey] = Object.assign({}, {[`${secondKey}`]: this.tempInfo.user_json[mainKey][secondKey]})
                    this.userJson[mainKey] = Object.assign({}, this.userJson[mainKey], {[`${secondKey}_disabled`]: !replace})
                } else {
                    if (replace) {
                        this.recordInfo[mainKey] = this.tempInfo.user_json[mainKey]
                    } else {
                        this.recordInfo[mainKey] = this.tempInfo[mainKey]
                    }
                    this.userJson = Object.assign({}, {[`${mainKey}`]: this.tempInfo.user_json[mainKey]})
                    this.userJson = Object.assign({}, this.userJson, {[`${mainKey}_disabled`]: !replace})
                    this.recordInfo[`${mainKey}_disabled`] = !replace;
                }
                this.sendMessage(this.userJson);
            },
            // 点击图片切换人工值及计算值
            handleChangeType(key) {
                let mainKey = key.split('.')[0], secondKey = key.split('.')[1];
                if (this.recordInfo[mainKey] !== undefined) {
                    let alreadyReplaced
                    if (secondKey) {
                        alreadyReplaced = !this.recordInfo[mainKey][`${secondKey}_disabled`]
                    } else {
                        alreadyReplaced = !this.recordInfo[`${mainKey}_disabled`]
                    }
                    let replace = !alreadyReplaced;
                    let text = replace ? '人工值' : '规则值'
                    this.$confirm(`确定将报告统计换成${text}？`, '提示', {
                        confirmButtonText: '确定',
                        cancelButtonText: '取消',
                        type: 'warning'
                    }).then(() => {
                        this.getData(key, replace)
                    })
                }
            },
            // 文本框的CSS
            editorCss(propertyChain) {
                let propertyArr = propertyChain.split('.');

                let tmpValue = this.tempInfo.user_json;
                for (let property of propertyArr) {
                    tmpValue && (tmpValue = tmpValue[property]);
                }
                if (tmpValue === undefined || tmpValue === null) {
                    return '';
                }

                propertyArr[propertyArr.length - 1] += "_disabled";
                let tmpDisabled = this.recordInfo;
                for (let property of propertyArr) {
                    tmpDisabled && (tmpDisabled = tmpDisabled[property]);
                }
                if (tmpDisabled) {
                    return '';
                }
                return 'input-active';
            },
            // 渲染是否显示切换图标
            renderIcon(key) {
                if (this.tempInfo.hasOwnProperty('user_json') && this.tempInfo.user_json !== null) {
                    if (key.split('.').length === 1) {
                        let mainKey = key.split('.')[0];
                        if (this.tempInfo.user_json.hasOwnProperty(mainKey) && this.tempInfo.user_json[mainKey] !== null) {
                            return true
                        } else {
                            return false
                        }
                    } else {
                        let mainKey = key.split('.')[0], secondKey = key.split('.')[1];
                        if (this.tempInfo.user_json.hasOwnProperty(mainKey) && this.tempInfo.user_json[mainKey] !== null) {
                            if (this.tempInfo.user_json[mainKey].hasOwnProperty(secondKey) && this.tempInfo.user_json[mainKey][secondKey] !== null) {
                                return true
                            } else {
                                return false
                            }
                        } else {
                            return false
                        }
                    }
                } else {
                    return false
                }
            },

            showEcg() {
                this.showEcgPart = true;
            },
            openIframe() {
                if (this.pdfWord) {
                    $('.showPdf').css('width', '100%');
                    this.pdfWord = false
                } else {
                    $('.showPdf').css('width', '600px');
                    this.pdfWord = true
                }
            },
            reloadPdf() {
//                if(!this.iframeLoading) {
                window.open(this.iframeSrc);
//                    document.getElementById('myPdf').src = this.iframeSrc;
//                }
            },
            getTime(gsec) {
                let hour = 0, min = 0, sec = 0;
                hour = parseInt(Number(gsec) / 3600);
                min = parseInt(Number(gsec) % 3600 / 60);
                sec = gsec % 3600 % 60;
                return hour + '小时' + min + '分' + sec + '秒'
            },
            deepObjectMerge(statistic) {
                let cloned = Object.assign({}, statistic); //复制, 不要修改原有对象
                let manual = cloned.user_json;
                cloned.user_json = null; //合并后的结果不应该有user_json
                this.merge(manual, cloned); //递归合并, 无论对象树有多深
                return cloned;
            },
            merge(src, dst) {
                for (let field in src) {
                    if (!this.endsWith(field, "_disabled")) { // 不是disabled字段
                        let value = src[field]; // 人工字段
                        if (typeof value == "object") { // 如果当前是一个对象
                            let dstObj = dst[field]; // 克隆字段
                            this.merge(value, dstObj); //递归
                        } else if (value != undefined && value != null && !src[field + "_disabled"]) { // 如果当前不是对象 不是null并且对应的disabled值是false
                            dst[field] = src[field];
                            dst[field + "_disabled"] = false;
                        }
                    } else {
                        dst[field] = src[field]
                    }
                }
            },
            endsWith(str, tail) { // 是否是disabled字段
                let offset = str.length - tail.length;
                return offset >= 0 && str.substring(offset) == tail;
            },
            getRecordInfo() {
                this.loading = true;
                API.getRecordInfo({
                    report_id: this.report_id
                }).then(data => {
                    this.loading = false;
                    if (data.heart_rate.over_speed_seconds.toString().indexOf('小时') === -1) {
                        data.heart_rate.over_speed_seconds = this.getTime(data.heart_rate.over_speed_seconds);
//                        this.changeItem();
                    }
                    if (data.heart_rate.slow_down_seconds.toString().indexOf('小时') === -1) {
                        data.heart_rate.slow_down_seconds = this.getTime(data.heart_rate.slow_down_seconds);
//                        this.changeItem();
                    }
                    if (typeof data.heart_rate.min_heart_rate === 'number') {
                        data.heart_rate.min_heart_rate = parseInt(Number(data.heart_rate.min_heart_rate));
                    }
                    if (typeof data.heart_rate.avg_heart_rate === 'number') {
                        data.heart_rate.avg_heart_rate = parseInt(Number(data.heart_rate.avg_heart_rate));
                    }
                    if (typeof data.heart_rate.max_heart_rate === 'number') {
                        data.heart_rate.max_heart_rate = parseInt(Number(data.heart_rate.max_heart_rate));
                    }
                    if (typeof data.hrv.gross_power === 'number') {
                        data.hrv.gross_power = Number(data.hrv.gross_power).toFixed(1);
                    }
                    if (typeof data.hrv.VLF === 'number') {
                        data.hrv.VLF = Number(data.hrv.VLF).toFixed(1);
                    }
                    if (typeof data.hrv.LF === 'number') {
                        data.hrv.LF = Number(data.hrv.LF).toFixed(1);
                    }
                    if (typeof data.hrv.HF === 'number') {
                        data.hrv.HF = Number(data.hrv.HF).toFixed(1);
                    }
                    if (typeof data.hrv.LF_HF === 'number') {
                        data.hrv.LF_HF = Number(data.hrv.LF_HF).toFixed(1);
                    }
                    if (typeof data.hrv.PNN50 === 'number') {
                        data.hrv.PNN50 = Number(data.hrv.PNN50).toFixed(1);
                    }
                    if (typeof data.hrv.SDNN === 'number') {
                        data.hrv.SDNN = Number(data.hrv.SDNN).toFixed(1);
                    }
                    if (typeof data.hrv.rMSSD === 'number') {
                        data.hrv.rMSSD = Number(data.hrv.rMSSD).toFixed(1);
                    }
                    if (typeof data.hrv.SDANN === 'number') {
                        data.hrv.SDANN = Number(data.hrv.SDANN).toFixed(1);
                    }
                    this.tempInfo = JSON.parse(JSON.stringify(data));
                    this.tempInfoForReset = JSON.parse(JSON.stringify(this.tempInfo))
                    this.recordInfo = this.deepObjectMerge(data);
                    this.recordInfoForReset = JSON.parse(JSON.stringify(this.recordInfo));
                    this.latestResultValue = this.recordInfo.result;
                }).catch(err => {
                    this.loading = false;
                })
            },
            backToView() {
                this.$router.push('/doctor/ecgView');
            },
            ifCanEnter(e) {
              if (e.target.scrollHeight >= 366) {
                  e.preventDefault();
              }
            },
            changeItem(e) {
                //↵/
                let key = $(e.target).attr('data-key');
                if (key === 'result') {
                    if (e.target.scrollHeight > 366) {
                        this.recordInfo = {
                            ...this.recordInfo,
                            result: this.latestResultValue
                        };
                        this.$message.closeAll();
                        this.$message.error('医师鉴定最多输入18行!');
                        return;
                    } else {
                        this.latestResultValue = e.target.value;
                    }
                }
                let mainKey = key.split('.')[0], secondKey = key.split('.')[1];
                if (secondKey) {
                    this.userJson[mainKey] = Object.assign({}, this.userJson[mainKey], {[secondKey]: this.recordInfo[mainKey][secondKey]}, {[`${secondKey}_disabled`]: false})
                    this.recordInfo[mainKey][`${secondKey}_disabled`] = false;
                    if (this.tempInfo.user_json === null) {
                        this.tempInfo.user_json = {}
                    }
                    this.tempInfo.user_json[mainKey] = Object.assign({}, this.tempInfo.user_json[mainKey], {[secondKey]: this.recordInfo[mainKey][secondKey]}, {[`${secondKey}_disabled`]: false})
                } else {
                    this.userJson = Object.assign({}, this.userJson, {[mainKey]: this.recordInfo[mainKey]}, {[`${mainKey}_disabled`]: false})
                    this.recordInfo[`${mainKey}_disabled`] = false;
                    if (this.tempInfo.user_json === null) {
                        this.tempInfo.user_json = {}
                    }
                    this.tempInfo.user_json = Object.assign({}, this.tempInfo.user_json, {[mainKey]: this.recordInfo[mainKey]}, {[`${mainKey}_disabled`]: false})
                }
                this.sendMessage(this.userJson);
            },
            sendMessage(userJson) {
                window.clearTimeout(this.timer);
                this.timer = setTimeout(() => {
                    this.userJson = {}
                    axios.post(`/ecg/save_pdf_indicators?report_id=${this.report_id}`, userJson, {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }).then(res => {
                        this.tempInfoForReset = JSON.parse(JSON.stringify(this.tempInfo));
                        this.recordInfoForReset = JSON.parse(JSON.stringify(this.recordInfo));
                        if (userJson.result) {
                            this.latestResultValue = this.recordInfoForReset.result;
                        }
                    }).catch(err => {
                        this.tempInfo = JSON.parse(JSON.stringify(this.tempInfoForReset));
                        this.recordInfo = JSON.parse(JSON.stringify(this.recordInfoForReset));
                    });
                }, 500)
            },
            resetRecord() {
                this.loading = true;
                API.resetRecordInfo({
                    report_id: this.report_id
                }).then(data => {
                    this.loading = false;
                    if (data.heart_rate.over_speed_seconds.toString().indexOf('小时') === -1) {
                        data.heart_rate.over_speed_seconds = this.getTime(data.heart_rate.over_speed_seconds);
                        this.changeItem();
                    }
                    if (data.heart_rate.slow_down_seconds.toString().indexOf('小时') === -1) {
                        data.heart_rate.slow_down_seconds = this.getTime(data.heart_rate.slow_down_seconds);
                        this.changeItem();
                    }
                    if (typeof data.heart_rate.min_heart_rate === 'number') {
                        data.heart_rate.min_heart_rate = parseInt(Number(data.heart_rate.min_heart_rate));
                    }
                    if (typeof data.heart_rate.avg_heart_rate === 'number') {
                        data.heart_rate.avg_heart_rate = parseInt(Number(data.heart_rate.avg_heart_rate));
                    }
                    if (typeof data.heart_rate.max_heart_rate === 'number') {
                        data.heart_rate.max_heart_rate = parseInt(Number(data.heart_rate.max_heart_rate));
                    }
                    if (typeof data.hrv.gross_power === 'number') {
                        data.hrv.gross_power = Number(data.hrv.gross_power).toFixed(1);
                    }
                    if (typeof data.hrv.VLF === 'number') {
                        data.hrv.VLF = Number(data.hrv.VLF).toFixed(1);
                    }
                    if (typeof data.hrv.LF === 'number') {
                        data.hrv.LF = Number(data.hrv.LF).toFixed(1);
                    }
                    if (typeof data.hrv.HF === 'number') {
                        data.hrv.HF = Number(data.hrv.HF).toFixed(1);
                    }
                    if (typeof data.hrv.LF_HF === 'number') {
                        data.hrv.LF_HF = Number(data.hrv.LF_HF).toFixed(1);
                    }
                    if (typeof data.hrv.PNN50 === 'number') {
                        data.hrv.PNN50 = Number(data.hrv.PNN50).toFixed(1);
                    }
                    if (typeof data.hrv.SDNN === 'number') {
                        data.hrv.SDNN = Number(data.hrv.SDNN).toFixed(1);
                    }
                    if (typeof data.hrv.rMSSD === 'number') {
                        data.hrv.rMSSD = Number(data.hrv.rMSSD).toFixed(1);
                    }
                    if (typeof data.hrv.SDANN === 'number') {
                        data.hrv.SDANN = Number(data.hrv.SDANN).toFixed(1);
                    }
                    this.tempInfo = JSON.parse(JSON.stringify(data));
                    this.tempInfoForReset = JSON.parse(JSON.stringify(data))
                    this.recordInfo = this.deepObjectMerge(data);
                    this.recordInfoForReset = JSON.parse(JSON.stringify(this.recordInfo));
                }).catch(err => {
                    this.loading = false;
                });
            }
        }
    }
</script>
<style scoped lang="scss">
    input:required, input:valid, input:invalid {
        border: 0 none;
        outline: 0 none;
        -webkit-box-shadow: none;
        -moz-box-shadow: none;
        -ms-box-shadow: none;
        -o-box-shadow: none;
        box-shadow: none;
    }

    textarea:required, textarea:valid, textarea:invalid {
        border: 0 none;
        outline: 0 none;
        -webkit-box-shadow: none;
        -moz-box-shadow: none;
        -ms-box-shadow: none;
        -o-box-shadow: none;
        box-shadow: none;
    }

    .change_icon {
        height: 16px;
        width: 16px;
        vertical-align: middle;
        margin-left: 5px;
    }

    .block1 .flexBox {
        span {
            width: 85px;
        }
    }

    .block2 .flexBox {
        width: 180px;

        span {
            width: 60px;
        }
    }

    .block4 .flexBox span {
        width: 90px;
    }

    .block5 .flexBox span {
        width: 50px;
    }

    .block6 .flexBox span {
        width: 55px;
    }

    /*.block7 .flexBox span {*/
    /*width:110px;*/
    /*}*/
    /*.flexBox input {*/
    /*flex: 1;*/
    /*}*/
    .outer {
        width: 1300px;
        position: relative;
        overflow: hidden;
        margin: 0 auto;
        padding-bottom: 40px;
    }

    .infoBox {
        position: relative;
        width: 1300px;

        .operateBox {
            /*display: flex;*/
            /*justify-content: space-between;*/
            width: 100%;
        }

        .tongjiBox {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-sizing: border-box;
            width: 100%;
            padding: 30px 10px;
            margin-top: 10px;
            border: 1px solid #000;
        }
    }

    .flexNormal {
        width: 100%;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        flex-wrap: wrap;
    }

    .infoWidth {
        width: 620px;
    }

    .formBox {
        position: relative;
        display: flex;
        justify-content: space-around;
        flex-wrap: wrap;
        box-sizing: border-box;
        width: 100%;
        background: #f0f0f0;
        padding: 6px;
    }

    fieldset {
        height: 255px;
        font-size: 12px;
        color: #000;
        padding-bottom: 8px;
        margin-bottom: 10px;
        border: 1px solid #ccc;

        legend {
            text-align: left;
            margin-left: 10px;
        }

        input {
            padding-left: 4px;
            flex: 1;
            /*width:0;*/
            overflow: hidden;
            font-size: 12px;
            height: 16px;
            outline: none;
            box-sizing: border-box;
            border: 1px solid #7b7b7b !important;
            box-shadow: 4px 4.5px 1px -4px inset;
        }
    }

    .flexColumn {
        box-sizing: border-box;
        padding: 0 0 12px 0;
        max-width: 100%;
        height: 100%;
        display: flex;
        justify-content: space-around;
        flex-direction: column;
    }

    /*.noFlex {*/
    /*display: block;*/
    /*}*/

    .flexBox {
        box-sizing: border-box;
        padding: 4px 6px;
        display: flex;
        justify-content: space-between;

        span {
            display: inline-block;
            max-width: 110px;
            word-break: normal;
            text-align: left;
        }
    }

    .morePadding {
        padding: 10px 6px;
    }

    .doctorSay {
        box-sizing: border-box;
        padding: 0 8px;
        width: 100%;
        color: #000;
        font-size: 12px;
        line-height: 20px;
        text-align: left;

        textarea {
            border: 1px solid #7b7b7b;
        }
    }

    .docWords {
        box-sizing: border-box;
        padding: 3px 6px;
        width: 100%;
        font-size: 12px;
        line-height: 20px;
        height: 220px;
        resize: none;
        outline: none;
        border: none;
        box-shadow: 4px 4.5px 1px -4px inset;
    }

    .rightShowBox {
        position: absolute;
        right: -110px;
        bottom: -222px;
        transform: scale(0.7);
    }

    .leftBox {
        float: left;
        width: 640px;
    }

    .showPdf {
        position: absolute;
        right: 20px;
        top: 49px;
        width: 600px;
        height: 770px;
        box-shadow: -2px 6px 21px -7px #000;
    }

    .input-active {
        border: 1px solid #f90000 !important;
    }

    .title {
        position: absolute;
        left: 10px;
        top: 6px;
        color: #2c3e50;
    }
</style>
