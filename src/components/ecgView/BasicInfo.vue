<template>
    <div class="basic-info">
        <el-dialog
                :visible.sync="dialogDeleteWindow"
                width="360px"
                :before-close="releaseDelete"
                :title="reAnalys?'重新片段分析':reverse?'翻转心电片段':'刪除心电片段'">
            <el-form ref="form" :model="reverseForm" label-width="80px">
                <el-form-item label="开始时刻" prop="startTime">
                    <el-time-picker
                            v-model="reverseForm.startTime"
                            :picker-options="{
                              selectableRange: selectRangeStart
                            }"
                            :value-format="formatType"
                            @change="changeRangeStartTime"
                            @focus="changeShowFocus"
                            v-if="hackResetTimer"
                            placeholder="开始时刻">
                    </el-time-picker>
                </el-form-item>
                <el-form-item label="结束时刻" prop="endTime">
                    <el-time-picker
                            v-model="reverseForm.endTime"
                            :picker-options="{
                              selectableRange: selectRangeEnd
                            }"
                            @change="changeRangeEndTime"
                            @focus="changeShowFocus"
                            :value-format="formatType"
                            v-if="hackResetTimer"
                            placeholder="结束时刻">
                    </el-time-picker>
                </el-form-item>
            </el-form>
            <span slot="footer" class="dialog-footer" v-if="!reverse">
                <el-button @click="selectAllDay" size="small" type="success">选择整天</el-button>
                <el-button type="primary" @click="reAnalys?reAnalystPart():deletePieceData()"
                           size="small"
                           :disabled="!(reverseForm.startTime && reverseForm.endTime)">确定</el-button>
                <el-button @click="releaseDelete" size="small">取消</el-button>
            </span>
            <span slot="footer" class="dialog-footer" v-if="reverse">
                <el-button @click="selectAllDay" size="small" type="success">选择整天</el-button>
                <el-button type="primary" @click="reverseBlock"
                           size="small"
                           :disabled="!(reverseForm.startTime && reverseForm.endTime)">确定</el-button>
                <el-button @click="releaseDelete" size="small">取消</el-button>
            </span>
        </el-dialog>
        <div class="basic-info-left">
            <span><span>姓名：</span><span class="basic-name" :title="basicInfo.name">{{basicInfo.name}}</span></span>
            <span>年龄：<span>{{basicInfo.age}}</span></span>
            <span>性别：<span>{{basicInfo.gender}}</span></span>
        </div>
        <div class="basic-info-right">
            <el-checkbox v-model="RRShowState" @change="changeRRShowState" style="margin-right: 10px">显示RR间期和心率
            </el-checkbox>
            <el-button style="margin-right: 10px" @click="dialogVisible = true">快捷键</el-button>
            <el-select class="select" v-model="rhythmTypeSelected" :disabled="rhythmTypeSelectDisabled" clearable
                       placeholder="请选择节律异常类型"
                       @change="changeRhythmType">
                <el-option
                        v-for="item in rhythmTypeOptions"
                        :key="item"
                        :value="item"
                        :label="rhythmTypeLabel(item)"
                >
                </el-option>
            </el-select>
            <el-select class="select" v-model="value" placeholder="请选择" @change="changeGain">
                <el-option
                        v-for="item in options"
                        :key="item"
                        :value="item">
                </el-option>
            </el-select>
            <el-button @click="openDialogReanalys" v-if="userType !== -1"
                       type="primary" :disabled="reportDisable">重新片段分析
            </el-button>
            <el-button @click="openDialogDelete" type="primary"
                       :disabled="reportDisable">删除片段
            </el-button>
            <el-button @click="openDialogReverse" type="primary"
                       :disabled="reportDisable">翻转片段
            </el-button>
        </div>
        <el-dialog
                title="操作说明"
                :visible.sync="dialogVisible"
                width="1000px"
                center
                top="8vh"
                class="explain"
        >
            <div class="explain">
                <h4>键盘操作:</h4>
                <h4 class="explain-subTitle">心拍操作:</h4>
                <p>W:上一个异常心拍</p>
                <p>S:下一个异常心拍</p>
                <p>A:上一个心拍</p>
                <p>D:下一个心拍</p>
                <p>/:当前心拍设置为导航心拍</p>
                <p>,:需先让当前心拍为导航心拍(/),导航到上一个同类心拍</p>
                <p>.:需先让当前心拍为导航心拍(/),导航到下一个同类心拍</p>
                <p>J:在当前小时内，跳转到上一个RR间期大于1500ms的心拍位置</p>
                <p>L:在当前小时内，跳转到下一个RR间期大于1500ms的心拍位置</p>
                <p>1/2/3/4:把当前心拍标注为N,V,S,Q</p>
                <p>Alt:按住alt，鼠标位置出现红竖线， 左键点击可自动识别当前位置附近的心电最高点，同时按住Ctrl键不放，这时添加的心拍不会自动寻找最高点。</p>
                <h4 class="explain-subTitle">心律操作:</h4>
                <p>Q:上一个心律异常</p>
                <p>E:下一个心律异常</p>
                <p>R:当前心律异常的结束标识位置</p>
                <p>点击+键，可添加节律，鼠标点击两次选中要添加的节律的起点终点，选择上方的节律异常下拉列表，确定添加的节律。</p>
                <h4 class="explain-subTitle">其他操作:</h4>
                <p>U:选择/取消当前事件作为报告用图，报告用图中时间为30秒，心拍事件图以心拍为中心取前15秒和后15秒；节律事件以事件起始点为中心前15秒和后15秒。</p>
                <p>ESC:取消掉当前状态，包括心拍心律选中状态，新增心拍或心律</p>
                <p>Delete:删除/恢复当前事件</p>
                <p>Z:上一个手动事件</p>
                <p>X:下一个手动事件</p>
                <p>Ctrl：长按Ctrl，拖动鼠标，出现淡红色透明框添加标尺，蓝色字体显示标尺的RR间期长。</p>
                <p>↑↓箭头：点击键盘向↑箭头，心电片段页面向上翻动8s;点击键盘向↓箭头，心电片段页面向下翻动8s;</p>
                <p>选中心拍时，用200ms宽，2mV高的50%透明度绿色方框作为选中标志， 切换为同类心拍导航时，柱子颜色变为黄色，在心律导航时柱子会变成蓝色。</p>
                <h4>鼠标操作:</h4>
                <p>鼠标左键：定位选中的心拍</p>
                <p>鼠标右键：定位选中的心拍，列表框选择设为起点心博、设为终点心博或修改单个心博；设为起点或终点心博后，淡红色表示选中心拍，
                    同样方式选中另一心博，设为终点或起点，对选中心拍之间的心电数据进行批量修改心博、添加节律或翻转片段。</p>
                <p>鼠标拖动：鼠标拖动，淡红色区域表示选中，鼠标结束点选择是否批量修改心博、添加事件或翻转片段</p>
            </div>
        </el-dialog>
    </div>
</template>

<script>
    import {mapMutations, mapState} from 'vuex'
    import API from '../../api/api_ecg_view';
    import {bus} from '../../bus';
    import Util from '../../common/util';

    export default {
        name: 'BasicInfo',
        data() {
            return {
                userType: -1,
                dialogVisibleWindow: false,
                dialogDeleteWindow: false,
                reAnalys: false,
                reverse: false,
                reportDisable: false,
                options: ['5mm/mV', '10mm/mV', '20mm/mV', '40mm/mV', '60mm/mV'],
                value: '10mm/mV',
                rhythmTypeOptions: ['NORMAL', 'BRD', 'TAC', 'ARR', 'VC', 'CV', 'BGM', 'TGM', 'VR', 'VF',
                    'VTAC', 'VBRD', 'SC', 'CS', 'SBGM', 'STGM', 'STAC', 'SBRD', 'SVR', 'AF', 'AFLUT', 'NOISE', 'CUSTOM'],
                dialogVisible: false,
//                toSrc: '/doctor/ecgReport',
                reverseForm: {
                    startTime: '',
                    endTime: ''
                },
                pickerOptionStart: {
                    start: '08:30',
                    step: '00:01',
                    end: '18:30'
                },
                pickerOptionEnd: {
                    start: '08:30',
                    step: '00:01',
                    end: '18:30'
                },
                selectRangeStart: '',
                selectRangeEnd: '',
                defaultDate: [],
                defaultTime: [],
                hackResetTimer: true
            }
        },
        methods: {
            ...mapMutations('ecgView', [
                'changeGainSelected',
                'changeStartBlockIndex',
                'changeLastBlockIndex',
                'changeRhythmTypeSelected',
                'changeRefreshState',
                'changeRRShowState',
                'changeValidDates',
                'changeDateIsContainData'
            ]),
            changeShowFocus() {
                this.$nextTick(() => {
                    if (!this.reverse) {
                        $('.el-time-spinner__wrapper').eq(2).css({display: 'none'})
                    }
                });
            },
            openDialogReanalys() {
                this.dialogDeleteWindow = true;
                this.reverseForm = {
                    ...this.reverseForm,
                    startTime: this.selectRangeStart.split(' - ')[0]
                };
                this.reAnalys = true;
                this.reverse = false;
            },
            openDialogDelete() {
                this.dialogDeleteWindow = true;
                this.reverseForm = {
                    ...this.reverseForm,
                    startTime: this.selectRangeStart.split(' - ')[0]
                };
                this.reAnalys = false;
                this.reverse = false;
            },
            openDialogReverse() {
                this.dialogDeleteWindow = true;
                this.reverseForm = {
                    ...this.reverseForm,
                    startTime: this.selectRangeStart.split(' - ')[0]
                };
                this.reverse = true;
                this.reAnalys = false;
            },
            // 修改数据在本地的存在状态
            deleteDayExist() {
                let index = this.validDates.indexOf(this.currentDate.split(' ')[0]);
                let containDateData = Object.assign([], this.datesIsContainData);
                containDateData[index] = false;
                this.changeDateIsContainData(containDateData);
                let firstValidIndex = Util.firstExistDataIndex(containDateData);
                if (firstValidIndex !== -1) {
                    bus.$emit('jumpToCard', firstValidIndex)
                }
            },
            judgeTime(time) {
                let splitTime = time.split(':');
                if (splitTime[2] !== '00') {
                    splitTime[2] = '00';
                }
                return splitTime.join(':');
            },
            /**
             * 选择整天的时间
             */
            selectAllDay() {
                let time = this.selectRangeStart.split(' - ');
                let startTime = this.judgeTime(time[0]);
                let endTime = this.judgeTime(time[1]);
                this.reverseForm = {
                    startTime: startTime,
                    endTime: endTime
                };
                this.initTimerPicker();
            },
            /**
             * 删除心电片段
             */
            deletePieceData() {
                this.$confirm('确定要删除此心电片段?', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    cancelButtonClass: 'submit-cancel-btn',
                    type: 'warning'
                }).then((action) => {
                    if (action === 'confirm') {
                        let currentDate = this.currentDate.split(' ')[0];
                        let endTime = currentDate + " " + this.reverseForm.endTime;
                        let fromTime = currentDate + " " + this.reverseForm.startTime;
                        if (this.reverseForm.endTime === '23:59:00') {
                            let splitDate = new Date(new Date(this.currentDate).getTime() + 24 * 60 * 60 * 1000).toLocaleDateString();
                            splitDate = splitDate.split('/').map(item => {
                                if (item.length === 1) {
                                    return '0' + item;
                                } else {
                                    return item;
                                }
                            }).join('/');
                            endTime = splitDate + " " + '00:00:00';
                            if (this.reverseForm.startTime === '00:00:00') {
                                this.deleteDayExist();
                            } else {
                                if (this.reverseForm.startTime === this.ecgStartTime.split(' ')[1]) {
                                    this.deleteDayExist();
                                }
                            }
                        }
                        if (this.reverseForm.startTime === this.ecgStartTime.split(' ')[1] && this.reverseForm.endTime === this.ecgEndTime.split(' ')[1]) {
                            this.deleteDayExist();
                        }
                        if (this.reverseForm.startTime === '00:00:00' && this.reverseForm.endTime === this.ecgEndTime.split(' ')[1]) {
                            this.deleteDayExist();
                        }
                        API.deleteBlocks(this.report_id, {
                            fromTime,
                            reportId: this.report_id,
                            toTime: endTime
                        }).then(data => {
                            this.dialogDeleteWindow = false;
                            this.$message.success('删除成功!');
                            this.releaseDelete();
                            this.resetReportStartEnd(fromTime, endTime)
                            this.ecgLoader.clearPositionRange(this.changeTimeToPosition(fromTime), this.changeTimeToPosition(endTime)) // 清除本地的心电缓存
                        }).catch(err => {
                            this.dialogDeleteWindow = false;
                        })
                    }
                })
            },
            changeTimeToPosition(time) {
                return (new Date(time).getTime() - new Date(this.ecgStartTime).getTime()) / 1000 * 512
            },
            // 判断当前删除的片段是否改变报告的start和end
            resetReportStartEnd(from, end) {
                if (new Date(from).getTime() <= new Date(this.ecgStartTime).getTime() + this.startBlockIndex * 60 * 1000
                    && new Date(this.ecgStartTime).getTime() + this.startBlockIndex * 60 * 1000 <= new Date(end).getTime()) {
                    let startBlockIndex = (new Date(end).getTime() - new Date(this.ecgStartTime).getTime()) / 1000 / 60
                    this.changeStartBlockIndex(startBlockIndex)
                } else if (new Date(from).getTime() <= new Date(this.ecgStartTime).getTime() + this.lastBlockIndex * 60 * 1000
                    && new Date(this.ecgStartTime).getTime() + this.lastBlockIndex * 60 * 1000 <= new Date(end).getTime()) {
                    let endBlockIndex = (new Date(end).getTime() - new Date(this.ecgStartTime).getTime()) / 1000 / 60
                    this.changeLastBlockIndex(endBlockIndex)
                }
            },
            /**
             * 重新AI分析
             */
            reAnalystPart() {
                this.$confirm('你确定要对该时间段重新AI分析吗?', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    cancelButtonClass: 'submit-cancel-btn',
                    type: 'warning'
                }).then((action) => {
                    if (action === 'confirm') {
                        let currentDate = this.currentDate.split(' ')[0];
                        let endTime = currentDate + " " + this.reverseForm.endTime;
                        let fromTime = currentDate + " " + this.reverseForm.startTime;
                        let newDate = new Date(new Date(this.currentDate).getTime() + 24 * 60 * 60 * 1000).toLocaleDateString().split('/').map(item => {
                            if (item.length < 2) {
                                return '0' + item;
                            } else {
                                return item;
                            }
                        }).join('/');
                        if (this.reverseForm.endTime === '23:59:00') {
                            endTime = newDate + " " + '00:00:00';
                        }
                        API.reAnalystPart(this.report_id, {
                            fromTime: fromTime,
                            toTime: endTime
                        }).then(data => {
                            this.dialogDeleteWindow = false;
                            this.$message.success('重新分析请求成功!');
                            this.returnPatientList();
                        }).catch(err => {
                            this.dialogDeleteWindow = false;
                        })
                    }
                })
            },
            /**
             * 翻转片段
             */
            reverseBlock(fromPos = null, toPos = null, fromBus = null) {
                this.$confirm('你确定要翻转该心电片段?', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    cancelButtonClass: 'submit-cancel-btn',
                    type: 'warning'
                }).then((action) => {
                    if (action === 'confirm') {
                        let startPos = fromPos;
                        let endPos = toPos;
                        if (!fromBus) {
                            let currentDate = this.currentDate.split(' ')[0];
                            let endTime = currentDate + " " + this.reverseForm.endTime;
                            let fromTime = currentDate + " " + this.reverseForm.startTime;
                            if (this.reverseForm.endTime === '23:59:59') {
                                endTime = currentDate + " " + '24:00:00'
                            }
                            startPos = (new Date(fromTime).getTime() - new Date(this.ecgStartTime).getTime()) / 1000 * 512;
                            endPos = (new Date(endTime).getTime() - new Date(this.ecgStartTime).getTime()) / 1000 * 512;
                        }
                        API.reverseVoltage({
                            from: startPos,
                            to: endPos,
                            reportId: this.report_id
                        }, this.report_id).then(_ => {
                            this.dialogDeleteWindow = false;
                            this.$message.success('片段翻转成功!');
                            console.log(startPos, endPos)
                            this.ecgLoader.clearPositionRange(startPos, endPos)
                        }).catch(err => {
                            this.dialogDeleteWindow = false;
                        })
                    }
                })
            },
            initTimerPicker() {
                this.hackResetTimer = false;
                this.$nextTick(() => {
                    this.hackResetTimer = true;
                })
            },
            changeRangeStartTime() {
                let endArr = this.selectRangeEnd.split(' - ');
                let startArr = this.selectRangeStart.split(' - ');
                if (this.reverseForm.startTime) {
                    let start = this.reverseForm.startTime;
                    this.selectRangeEnd = start + ' - ' + endArr[1];
                } else {
                    let end = this.reverseForm.endTime;
                    this.calcTimerPicker();
                    startArr = this.selectRangeStart.split(' - ');
                    this.selectRangeStart = startArr[0] + ' - ' + end;
                }
                this.initTimerPicker();
            },
            changeRangeEndTime() {
                let endArr = this.selectRangeEnd.split(' - ');
                let startArr = this.selectRangeStart.split(' - ');
                if (this.reverseForm.endTime) {
                    let end = this.reverseForm.endTime;
                    this.selectRangeStart = startArr[0] + ' - ' + end;
                } else {
                    let start = this.reverseForm.startTime;
                    this.calcTimerPicker();
                    endArr = this.selectRangeEnd.split(' - ');
                    this.selectRangeEnd = start + ' - ' + endArr[1];
                }
                this.initTimerPicker();
            },
            //取消删除
            releaseDelete() {
                this.dialogDeleteWindow = false;
                this.reverseForm = {
                    startTime: '',
                    endTime: ''
                };
                this.calcTimerPicker();
            },
            changeGain(data) {
                this.$emit('hasOperate')
                this.changeGainSelected(parseInt(data));
            },
            changeRhythmType(data) {
                this.$emit('hasOperate')
                this.changeRhythmTypeSelected(data);
            },
            returnPatientList() {
                let user = JSON.parse(localStorage.getItem('access-user'));
                if (user.userType === 0) {
                    this.$router.push('/doctor/patientList');
                }
                if (user.userType === 3) {
                    this.$router.push('/auditor/patientList');
                }
            },
            rhythmTypeLabel(value) {
                return Util.rhythmTranslateMap[value] || value
            },
            calcTimerPicker() {
                let currentDate = this.currentDate.split(' ')[0];
                let startDate = this.ecgStartTime.split(' ')[0];
                let endDate = this.ecgEndTime.split(' ')[0];
                let startTime = this.ecgStartTime.split(' ')[1].slice(0, 5);
                let endTime = this.ecgEndTime.split(' ')[1].slice(0, 5);
                if (currentDate !== startDate) startTime = '00:00';
                if (startDate !== endDate) endTime = '24:00';
                if (currentDate === endDate) endTime = this.ecgEndTime.split(' ')[1].slice(0, 5);
                this.pickerOptionStart = {
                    ...this.pickerOptionStart,
                    start: startTime,
                    end: endTime
                };
                let rangeEnd = endTime + ':00';
                if (rangeEnd === '24:00:00') rangeEnd = '23:59:59';
                this.selectRangeStart = startTime + ':00' + ' - ' + rangeEnd;
                this.selectRangeEnd = startTime + ':00' + ' - ' + rangeEnd;
                this.pickerOptionEnd = {
                    ...this.pickerOptionEnd,
                    start: startTime,
                    end: endTime
                }
            },
        },
        mounted() {
            if (this.basicInfo.state === 'FINISH' || this.basicInfo.state === 'AUDIT_PASS') {
                this.reportDisable = true;
            }
//            let user = JSON.parse(localStorage.getItem('access-user'));
//            let userType = user.userType;
//            let doctorId = user.id;
//            let reportId = localStorage.getItem('report_id');
//            let scopeRow = JSON.parse(localStorage.getItem('scope_row'));
//            console.log(scopeRow)
//            let recordState = scopeRow.record_state;
//            let auditState = scopeRow.audit_state;
//            let recordId = scopeRow.record_id;
//            let isRecommit = scopeRow.isRecommit;
//            this.toSrc += `?userType=${userType}&doctorId=${doctorId}&reportId=${reportId}&recordState=${recordState}&auditState=${auditState}&recordId=${recordId}&isRecommit=${isRecommit}`;
            bus.$off('reverseBlock', this.reverseBlock);
            bus.$on('reverseBlock', this.reverseBlock);
        },
        created() {
            this.userType = JSON.parse(localStorage.getItem('access-user')).userType
        },
        watch: {
            ecgEndTime: function () {
                if (this.ecgEndTime.length) {
                    this.calcTimerPicker();
                }
            },
            currentDate: function () {
                this.calcTimerPicker();
            }
        },
        computed: {
            ...mapState('ecgView', {
                basicInfo: state => state.basicInfo,
                refreshState: state => state.refreshState,
                ecgStartTime: state => state.ecgStartTime,
                ecgEndTime: state => state.ecgEndTime,
                startBlockIndex: state => state.startBlockIndex,
                lastBlockIndex: state => state.lastBlockIndex,
                currentDate: state => state.currentDate,
                validDates: state => state.validDates,
                rhythmTypeSelectDisabled: state => state.rhythmTypeSelectDisabled,
                ecgLoader: state => state.ecgLoader,
                datesIsContainData: state => state.datesIsContainData
            }),
            ...mapState('ecgDayCards', {
                dates: state => state.dates,
            }),
            formatType() {
                if (this.reverse) {
                    return 'HH:mm:ss'
                } else {
                    return 'HH:mm:00'
                }
            },
            RRShowState: {
                get: function () {
                    return this.$store.state.ecgView.RRShowState;
                },
                set: function () {
                }
            },
            rhythmTypeSelected: {
                get: function () {
                    return this.$store.state.ecgView.rhythmTypeSelected
                },
                set: function () {

                }
            },
            report_id: function () {
                return localStorage.getItem('report_id');
            }
        }
    }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
    .basic-info {
        display: flex;
        justify-content: space-between;
    }

    .select {
        margin-right: 10px;
    }

    .basic-info-left > span {
        margin-right: 10px;
    }

    .explain > p {
        margin-bottom: 5px;
        margin-left: 10px;
    }

    .basic-name {
        display: inline-block;
        width: 80px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        vertical-align: bottom;
    }

    .explain-subTitle {
        margin-left: 5px;
    }

    .basic-info .explain /deep/ .el-dialog__body {
        padding: 12px;
    }
</style>
