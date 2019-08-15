<template>
    <div>
        <div class="AF-fragment-box">
            <div>
                <el-table
                        ref="tempAFTable"
                        :data="afFragmentData"
                        style="width: 100%"
                        :cell-style="{padding:0}"
                        max-height="290"
                        :highlight-current-row="true"
                        @row-click="afFragmentTableRowClick"
                        :row-class-name="tableRowClassName"
                >
                    <!--<el-table-column
                            type="selection"
                            width="30"
                            :reserve-selection="true"
                    >
                    </el-table-column>-->
                    <el-table-column
                            prop="time"
                            label="发生时刻"
                    >
                    </el-table-column>
                    <el-table-column
                            prop="timeLen"
                            label="持续时间"
                    >
                    </el-table-column>
                    <el-table-column
                            prop="type"
                            label="事件类型"
                    >
                        <template slot-scope="scope">
                            {{scope.row.type === 'AF' ? '房顫' : '房扑'}}
                        </template>
                    </el-table-column>

                    <el-table-column
                            label="操作"
                            width="85"
                    >
                        <template slot-scope="scope">
                            <el-button type="text" size="small" @click="editAfRhythm(scope.row)">编辑</el-button>
                            <el-button type="text" size="small" @click="saveAfRhythm(scope.row)"
                                       :disabled="scope.row.isSavedState">{{scope.row.isSavedState ? '已存' : '保存'}}
                            </el-button>
                        </template>
                    </el-table-column>
                </el-table>
            </div>
            <div>
                <el-table
                        ref="savedAFTable"
                        :data="savedAFRhythms"
                        style="width: 100%"
                        :cell-style="{padding:0}"
                        max-height="290"
                        :highlight-current-row="true"
                        @row-click="savedFragmentTableRowClick"
                        :row-class-name="tableRowClassName"
                        v-loading="savedAFTableLoading"
                >
                    <el-table-column
                            label="操作"
                    >
                        <template slot-scope="scope">
                            <el-button icon="el-icon-delete" size="small" @click="deleteRhythm(scope.row)"></el-button>
                        </template>
                    </el-table-column>
                    <el-table-column
                            prop="time"
                            label="发生时刻"
                    >
                    </el-table-column>
                    <el-table-column
                            prop="timeLen"
                            label="持续时间"
                    >
                    </el-table-column>
                    <el-table-column
                            prop="type"
                            label="事件类型">
                        <template slot-scope="scope">
                            {{scope.row.type === 'AF' ? '房顫' : '房扑'}}
                        </template>
                    </el-table-column>
                </el-table>
            </div>
        </div>
        <el-dialog
                :visible.sync="editAfRhythmDialogState"
                width="400px"
                center
                top="430px"
                :show-close="false"
                :close-on-click-modal="false"
                :close-on-press-escape="false"
        >
            <div class="edit-dialog-content">
                <div>
                    发生时刻：
                    <el-time-picker
                            v-model="editTime"
                            @change="changeStartTime"
                            :picker-options="{
                        selectableRange: '00:00:00 - 23:59:59'
                    }"
                            placeholder="发生时刻">
                    </el-time-picker>
                </div>
                <div>
                    结束时刻：
                    <el-time-picker
                            v-model="editEndTime"
                            @change="changeStartTime"
                            :picker-options="{
                        selectableRange: `00:00:00 - 23:59:59`
                    }"
                            placeholder="结束时刻">
                    </el-time-picker>
                </div>
                <div>
                    持续时间：
                    <el-time-picker
                            v-model="editTimeLen"
                            @change="changeExistTime"
                            :picker-options="{
                        selectableRange: '00:00:10 - 23:59:59'
                    }"
                            placeholder="持续时间">
                    </el-time-picker>
                </div>
                <div style="height: 40px;line-height: 40px">
                    事件类型：
                    <el-radio v-model="editRhythmType" label="AF">房颤</el-radio>
                    <el-radio v-model="editRhythmType" label="AFLUT">房扑</el-radio>
                </div>
            </div>
            <span slot="footer" class="dialog-footer">
                 <el-button type="primary" @click="confirmEdit">修改</el-button>
                <el-button @click="cancelEdit">取 消</el-button>
            </span>
        </el-dialog>
    </div>
</template>

<script>
    import {mapState, mapMutations, mapActions} from 'vuex';
    import API from '../../api/api_af_view';
    import Util from '../../common/util';
    import ecgViewAPI from '../../api/api_ecg_view'
    import {bus} from '../../bus';
    import axios from "axios";

    export default {
        name: 'AFFragmentList',
        data() {
            return {
                savedAFRhythms: [],
                editAfRhythmDialogState: false,
                editInitTime: '00:00:00',
                editInitEndTime: '00:00:00',
                editInitTimeLen: '00:00:00',
                editInitRhythmType: 'AF',
                editTime: '00:00:00',
                editEndTime: '00:00:00',
                editTimeLen: '00:00:00',
                editRhythmType: 'AF',
                editRow: null,
                selectedTableRow: {
                    startTimeStamp: 0,
                    endTimeStamp: 0,
                    type: 'AF'
                },
                savedAFTableLoading: false,
            }
        },
        computed: {
            ...mapState('afView', {
                afFragmentData: state => state.afFragmentData,
                TALMultipleSelection: state => state.TALMultipleSelection
            }),
            ...mapState('ecgView', {
                validDates: state => state.validDates,
                ecgStartTime: state => state.ecgStartTime,
                dateIndex: state => state.dateIndex,
                datesIsContainData: state => state.datesIsContainData
            }),
            report_id: function () {
                return localStorage.getItem('report_id');
            },
            formatYMD: function () {
                return this.validDates[this.dateIndex].replace(/\-/g, '/');
            }
        },
        watch: {
            dateIndex: function (dateIndex) {
                this.getDateRhythm(dateIndex);
            }
        },
        methods: {
            ...mapMutations('afView',
                [
                    'changeAfFragmentData2',
                    'changeSelectedTime',
                    'changeTALMultipleSelection'
                ]
            ),
            /**
             * 修改房扑房颤节律开始时间而引起持续时间变化
             */
            changeStartTime() {
                let startTime = new Date(this.editTime).getTime();
                let endTime = new Date(this.editEndTime).getTime();
                if (endTime < startTime) {
                    let temp = this.editTime;
                    this.editTime = this.editEndTime;
                    this.editEndTime = temp;
                }
                this.editTimeLen = new Date(this.formatYMD + ' ' + Util.calcTimeLength(new Date(this.editTime), new Date(this.editEndTime)));
            },
            /**
             * 修改房扑房颤持续时间而引起结束时间变化
             */
            changeExistTime() {
                let startTime = new Date(this.editTime).getTime();
                let timeLen = new Date(this.editTimeLen).getTime();
                let baseTime = new Date(this.formatYMD + ' ' + '00:00:00').getTime();
                let currentDay = new Date(startTime).getDay();
                let newDay = new Date(startTime + timeLen - baseTime).getDay();
                if (newDay !== currentDay) {
                    this.editEndTime = new Date(this.formatYMD + ' ' + '23:59:59');
                    startTime = new Date(this.editEndTime).getTime();
                    this.editTime = new Date(this.formatYMD + ' ' + Util.formatTimeH(new Date(startTime - timeLen + baseTime)));
                } else {
                    this.editEndTime = new Date(this.formatYMD + ' ' + Util.formatTimeH(new Date(startTime + timeLen - baseTime)));
                }
            },
            calcFromToTime(dateIndex) {
                let fromTime = this.validDates[dateIndex].replace(/\-/g, '/') + ' 00:00:00';
                let date = new Date(fromTime);
                date.setDate(date.getDate() + 1);
                let toTime = Util.formatTimeM(date);
                return [fromTime, toTime];
            },
            editAfRhythm(row) {
                this.editRow = row;
                let formatTime = this.formatYMD + ' ' + row.time;
                let formatTimeLen = this.formatYMD + ' ' + row.timeLen;
                let formatEndTime = this.formatYMD + ' ' + row.endDate;
                //存储修改前的信息
                this.editInitTime = new Date(formatTime);
                this.editInitTimeLen = new Date(formatTimeLen);
                this.editInitEndTime = new Date(formatEndTime);
                this.editInitRhythmType = row.type;

                this.editTime = this.editInitTime;
                this.editTimeLen = this.editInitTimeLen;
                this.editEndTime = this.editInitEndTime;
                this.editRhythmType = this.editInitRhythmType;
                this.editAfRhythmDialogState = true;
            },
            cancelEdit() {
                this.editTime = this.editInitTime;
                this.editTimeLen = this.editInitTimeLen;
                this.editRhythmType = this.editInitRhythmType;
                this.editEndTime = this.editInitEndTime;
                this.editAfRhythmDialogState = false;
            },
            confirmEdit() {
                let that = this;
                let afFragmentData = this.afFragmentData.map((row, index) => {
                    if (row.time === this.editRow.time && row.timeLen === this.editRow.timeLen && row.endDate === this.editRow.endDate && row.type === this.editRow.type) {
                        return {
                            time: Util.formatTimeH(that.editTime),
                            timeLen: Util.formatTimeH(that.editTimeLen),
                            endDate: Util.formatTimeH(that.editEndTime),
                            type: that.editRhythmType,
                            isSavedState: that.isSavedState,
                        }
                    } else {
                        return row
                    }
                });
                this.changeAfFragmentData2(afFragmentData);
                this.editAfRhythmDialogState = false;
            },
            getDateRhythm(dataIndex) {
                let calcFromToTimeArr = this.calcFromToTime(dataIndex);
                API.dateRhythms(
                    this.report_id,
                    {
                        fromTime: calcFromToTimeArr[0],
                        toTime: calcFromToTimeArr[1],
                        optionalIncludeDeletedRhythms: false,
                        optionalRhythmTypes: 'AF,AFLUT',
                    }).then((data) => {
                    this.savedAFRhythms = data.map(v => {
                        return {
                            position: v.rhythmData.fromIndex,
                            time: Util.formatTimeH(new Date(v.startTime)),
                            timeLen: Util.calcTimeLength(new Date(v.startTime), new Date(v.endTime)),
                            type: v.rhythmData.type
                        }
                    });
                    this.savedAFTableLoading = false;
                }).catch(() => {
                    this.savedAFTableLoading = false;
                });
            },
            //点击临时性列表的某一行
            afFragmentTableRowClick(row) {
                //清空永久列表的选中状态
                this.$refs.savedAFTable.setCurrentRow();
                //清空临时列表的关联行状态
                let tempAfFragmentData = this.afFragmentData.map(rhythm => {
                    if (rhythm.active) {
                        delete rhythm.active;
                    }
                    return rhythm;
                });
                this.changeAfFragmentData2(tempAfFragmentData);
                this.jumpToTimeEcg(row.time);
                this.savedAFRhythms = this.filterRelatedRhythms(false, this.savedAFRhythms, this.createdSelectedTableRow(row));
                this.$refs.savedAFTable.bodyWrapper.scrollTop = 0;
            },
            //点击永久列表的某一行
            savedFragmentTableRowClick(row) {
                //清空临时列表的选中状态
                this.$refs.tempAFTable.setCurrentRow();
                //清空永久性列表的关联行状态
                this.savedAFRhythms = this.savedAFRhythms.map((rhythm) => {
                    if (rhythm.active) {
                        delete rhythm.active
                    }
                    return rhythm;
                });
                this.jumpToTimeEcg(row.time);
                this.changeAfFragmentData2(this.filterRelatedRhythms(true, this.afFragmentData, this.createdSelectedTableRow(row)));
                this.$refs.tempAFTable.bodyWrapper.scrollTop = 0;
            },
            jumpToTimeEcg(startTime) {
                let formatTime = this.formatYMD + ' ' + startTime;
                let seconds = (new Date(formatTime).getTime() - new Date(this.ecgStartTime).getTime()) / 1000;
                this.changeSelectedTime(seconds);
            },
            createdSelectedTableRow(row) {
                let selectedTableRow = {};
                selectedTableRow.type = row.type;
                selectedTableRow.startTimeStamp = new Date(this.formatYMD + ' ' + row.time).getTime();
                selectedTableRow.endTimeStamp = new Date(this.formatYMD + ' ' + row.timeLen).getTime()
                    - new Date(this.formatYMD + ' 00:00:00').getTime() + selectedTableRow.startTimeStamp;
                return selectedTableRow;
            },
            saveAfRhythm(row) {
                let formatTime = this.formatYMD + ' ' + row.time;
                let seconds = (new Date(formatTime).getTime() - new Date(this.ecgStartTime).getTime()) / 1000;
                let formatTimeLen = this.formatYMD + ' ' + row.timeLen;
                let currentDateTime = this.formatYMD + ' 00:00:00';
                let timeLengthSeconds = (new Date(formatTimeLen).getTime() - new Date(currentDateTime).getTime()) / 1000;
                let toIndex = seconds * 512 + timeLengthSeconds * 512;
                let params = {
                    from: seconds * 512,
                    to: toIndex,
                    force: false,
                    abnormal_type: 1
                };
                this.savedAFTableLoading = true;
                ecgViewAPI.upDateTagRhythmNew(this.report_id, row.type, params).then((res) => {
                    this.$message({
                        message: '保存成功',
                        type: 'success'
                    });
//                    this.savedAFTableLoading = false;
                    //改变临时列表的保存按钮状态
                    let afFragmentData = this.afFragmentData.map((v, index) => {
                        if (v.time === row.time && v.timeLen === row.timeLen && v.type === row.type) {
                            return {
                                time: v.time,
                                timeLen: v.timeLen,
                                type: v.type,
                                isSavedState: true,
                            }
                        } else {
                            return v
                        }
                    });
                    this.changeAfFragmentData2(afFragmentData);
                }).catch((err) => {
                    //这里不用统一的错误提示
                    bus.$emit('hideErrorMessage', true);
                    if (err.response) {
                        if (err.response.data) {
                            if (err.response.data.code === 'CONFLICT') {
                                this.$confirm('该时段存在其他心律，是否要强制覆盖？', '提示', {
                                    confirmButtonText: '确定',
                                    cancelButtonText: '取消',
                                    type: 'warning'
                                }).then(() => {
                                    ecgViewAPI.upDateTagRhythmNew(this.report_id, row.type, {
                                        from: seconds * 512,
                                        to: toIndex,
                                        force: true,
                                        abnormal_type: 1
                                    }).then(() => {
                                        this.$message({
                                            message: '保存成功',
                                            type: 'success'
                                        });
//                                        this.savedAFTableLoading = false;
                                        //改变临时列表的保存按钮状态
                                        let afFragmentData = this.afFragmentData.map((v, index) => {
                                            if (v.time === row.time && v.timeLen === row.timeLen && v.type === row.type) {
                                                return {
                                                    time: v.time,
                                                    timeLen: v.timeLen,
                                                    type: v.type,
                                                    isSavedState: true,
                                                }
                                            } else {
                                                return v
                                            }
                                        });
                                        this.changeAfFragmentData2(afFragmentData);
                                    })
                                }).catch(() => {
                                    this.savedAFTableLoading = false;
                                })
                            } else {
                                let errMessage = err.response.data.message;
                                if (
                                    (errMessage === '不能修改该状态下的报告!')
                                    || (errMessage === '不存在该报告!')
                                    || (err.response.data.code === 'ILLEGAL')
                                    ||(errMessage==='该节律已经保存')
                                ) {
                                    this.$message.error(err.response.data.message);
                                }
                                this.savedAFTableLoading = false;
                            }
                        }
                    }
                })
            },
            deleteRhythm(row) {
                this.$confirm('确定要删除这段心律?', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning'
                }).then(() => {
                    this.savedAFTableLoading = true;
                    let params = {
                        report_id: this.report_id,
                        abnormal_type: 1,
                        position: row.position,
                        label: row.type,
                        state: 0
                    };
                    ecgViewAPI.userSignTagRhythm(params).then(() => {

                    }).catch(() => {
                        this.savedAFTableLoading = false;
                    })
                }).catch(() => {

                });
            },
            filterRelatedRhythms(isTempRhythms, afRhythms, selectedTableRow) {
                let activeRhythms = [];
                let noActiveRhythms = [];
                let tempRhythms = afRhythms.map((rhythm) => {
                    let startStamp = new Date(this.formatYMD + ' ' + rhythm.time).getTime();
                    let endStamp = new Date(this.formatYMD + ' ' + rhythm.timeLen).getTime() - new Date(this.formatYMD + ' 00:00:00').getTime() + startStamp;
                    if (rhythm.active) {
                        delete rhythm.active;
                    }
                    let formatRhythm = rhythm;
                    if (!(selectedTableRow.endTimeStamp < startStamp || selectedTableRow.startTimeStamp > endStamp)) {
                        if (selectedTableRow.type === rhythm.type) {
                            if (isTempRhythms) {
                                formatRhythm = {
                                    time: rhythm.time,
                                    timeLen: rhythm.timeLen,
                                    type: rhythm.type,
                                    isSavedState: rhythm.isSavedState,
                                    active: true,
                                };
                            } else {
                                formatRhythm = {
                                    time: rhythm.time,
                                    timeLen: rhythm.timeLen,
                                    type: rhythm.type,
                                    position: rhythm.position,
                                    active: true,
                                };
                            }
                        }
                    }
                    return formatRhythm;
                });
                tempRhythms.forEach((rhythm) => {
                    if (rhythm.active) {
                        activeRhythms.push(rhythm);
                    } else {
                        noActiveRhythms.push(rhythm);
                    }
                });
                activeRhythms.sort((a, b) => {
                    return new Date(this.formatYMD + ' ' + a.time).getTime() - new Date(this.formatYMD + ' ' + b.time).getTime();
                });
                noActiveRhythms.sort((a, b) => {
                    return new Date(this.formatYMD + ' ' + a.time).getTime() - new Date(this.formatYMD + ' ' + b.time).getTime();
                });
                return activeRhythms.concat(noActiveRhythms);
            },
            tableRowClassName({row, rowIndex}) {
                if (row.active === true) {
                    return 'selected-row';
                }
                return '';
            },
//            handleSelectionChange(val) {
//                this.changeTALMultipleSelection(val);
//            },
//            getRowKeys(row) {
//                return row.time
//            },
        },
        mounted() {
            this.savedAFTableLoading = true;
            this.getDateRhythm(Util.firstExistDataIndex(this.datesIsContainData));
            bus.$on('updateSavedAFRhythmTable', () => {
                this.getDateRhythm(this.dateIndex);
            });
        },
        beforeDestroy() {
            bus.$off('updateSavedAFRhythmTable');
        }
    }
</script>
<style>
    .AF-fragment-box .el-table--striped .el-table__body tr.el-table__row--striped.current-row td,
    .AF-fragment-box .el-table__body tr.current-row > td {
        background-color: #d0cbff;
    }

    .AF-fragment-box .el-table--enable-row-hover .el-table__body tr.current-row:hover > td {
        background-color: #d0cbff;
    }

    .AF-fragment-box .el-table .selected-row {
        background: #f9dcc2;
    }

    .AF-fragment-box .el-table--enable-row-hover .el-table__body tr.selected-row:hover > td {
        background-color: #f9dcc2;
    }
</style>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
    .AF-fragment-box {
        width: 770px;
        display: flex;
    }

    .AF-fragment-box > div {
        width: 375px;
    }

    .AF-fragment-box > div:first-child {
        margin-right: 10px;
    }

    .edit-dialog-content > div {
        margin-bottom: 10px;
    }
</style>
