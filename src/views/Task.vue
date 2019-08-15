<template>
    <el-col :span="24" class="contentBox">
        <div class="whiteBack">
            <div class="title">
                <p class="pullLeft">任务列表</p>
                <div class="pullRight">
                    <el-button type="primary" size="small" icon="el-icon-refresh" @click="refreshAll">刷新</el-button>
                </div>
            </div>

            <!--只有高权限才显示的分配模块-->
            <div class="operateBox" v-if="!personLevel">
                <div class="marginBottom">
                    <el-input v-model="getNumber" placeholder="请输入获取数据条数" class="normalInp"
                              @input="changeInpGetData"></el-input>
                    <el-button type="primary" plain @click="getData" :disabled="getDataDisButton">获取</el-button>
                    <el-select v-model="selectDoctor"
                               placeholder="选择分配医生"
                               @change="changeDoctorOption"
                               class="normalInp"
                    >
                        <el-option
                                v-for="item in doctorOptions"
                                :key="item.value"
                                :label="item.label"
                                :value="item.value"
                                :id="item.id"
                        >
                        </el-option>
                    </el-select>
                    <el-input v-model="emmitNum" placeholder="请输入分配数据条数" class="normalInp"
                              @input="changeAssignNum"></el-input>
                    <el-button type="warning" plain :disabled="assignDataDisButton" @click="assignTask">分配</el-button>
                    <span class="normalText"> 未分配: <span class="orange">{{ notEmmitNum }}</span> 条。</span>
                </div>
            </div>
            <div class="taskContent">
                <el-tabs v-model="activeName">
                    <el-tab-pane label="任务列表" name="first" v-if="!ifAuditor">
                        <TaskList :taskData="taskData"
                                  :handleCurrentChangeTask="handleCurrentChangeTask"
                                  :taskPageIndex="taskPageIndex"
                                  :taskPageSize="taskPageSize"
                                  :loading="taskLoading"
                        />
                    </el-tab-pane>
                    <el-tab-pane label="已完成任务" name="second" v-if="!ifAuditor">
                        <TaskFinishedList :taskFinishedData="taskFinishedData"
                                          :handleCurrentChangeResolve="handleCurrentChangeResolve"
                                          :resolvePageSize="resolvePageSize"
                                          :personLevel="personLevel"
                                          :changeDoctId="changeDoctId"
                                          :doctorOptions="doctorOptions"
                                          :unResolvedNum="unResolvedNum"
                                          :getResolvedOther="getResolvedOther"
                                          :loading="resolveLoading"
                        />
                    </el-tab-pane>
                    <el-tab-pane label="被打回任务" name="third" v-if="!ifAuditor">
                        <TaskRejectList :taskRejectData="taskRejectData"
                                        :handleCurrentChangeRepulse="handleCurrentChangeRepulse"
                                        :repulsePageSize="repulsePageSize"
                                        :loading="rejectLoading"
                        />
                    </el-tab-pane>
                    <el-tab-pane label="审核列表" name="fourth" v-if="ifAuditor">
                        <TaskReview :taskReviewData="taskReviewData"
                                    :handleCurrentChangeReview="handleCurrentChangeReview"
                                    :auditorPageSize="auditorPageSize"
                                    :loading="auditorLoading"
                        />
                    </el-tab-pane>
                </el-tabs>
            </div>
        </div>

    </el-col>
</template>

<script lang="ts">
    import Vue from 'vue'
    import axios from 'axios';
    import TaskList from '../components/taskView/TaskList.vue';
    import TaskFinishedList from '../components/taskView/TaskFinishedList.vue';
    import TaskRejectList from '../components/taskView/TaskRejectList.vue';
    import TaskReview from '../components/taskView/TaskReview.vue';

    export default {
        name: 'task',
        components: {
            TaskList,
            TaskFinishedList,
            TaskRejectList,
            TaskReview,
        },
        data () {
            return {
                getNumber: null,
                emmitNum: null,
                notEmmitNum: 0,
                selectDoctor: '',
                activeName: 'first',
                personLevel: 0,
                ifAuditor: false,
                getDataDisButton: true,
                assignDataDisButton: true,
                doctorOptions: [],
                doctorId: -1,
                token: '',
                taskLoading: false,
                rejectLoading: false,
                auditorLoading: false,
                resolveLoading: false,
                taskPageIndex: 1,
                taskPageSize: 1,
                unResolvedNum: 0,
                resolvePageIndex: 1,
                resolvePageSize: 1,
                repulsePageIndex: 1,
                repulsePageSize: 1,
                auditorPageIndex: 1,
                auditorPageSize: 1,
                taskData: [],
                taskFinishedData: [],
                taskRejectData: [],
                taskReviewData: [],
            }
        },
        methods: {
            handleCurrentChangeTask(val) {
                this.taskPageIndex = Number(val);
                this.getTaskData();
            },
            handleCurrentChangeReview(val) {
                this.repulsePageIndex = Number(val);
                this.getRejectTaskData();
            },
            handleCurrentChangeResolve(val) {
                this.resolvePageIndex = Number(val);
                this.getResolvedTaskData();
            },
            handleCurrentChangeRepulse(val) {
                this.repulsePageIndex = Number(val);
                this.getRejectTaskData();
            },
            changeInpGetData(val) {
                if (/^[1-9]\d*$/g.test(val.toString())) {
                    this.getDataDisButton = false;
                } else {
                    this.getDataDisButton = true;
                    this.$message.error("请输入正确的正整数!");
                }
            },
            judgeDisAssign() {
                if (this.doctorId !== -1 && this.emmitNum) {
                    this.assignDataDisButton = false;
                } else {
                    this.assignDataDisButton = true;
                }
            },
            changeAssignNum(val) {
                if (Number(val) > this.notEmmitNum) {
                    this.$message.error("超出最大未分配数!");
                    return;
                }
                if (/^[1-9]\d*$/g.test(val.toString())) {
                    this.judgeDisAssign();
                } else {
                    this.assignDataDisButton = true;
                    this.$message.error("请输入正确的数或者选好分配医生!");
                }
            },
            getData() {
                let url = "/newTask/" + this.getNumber;
                this.$alert(`你确认获取${this.getNumber}条数据？`, {
                    confirmButtonText: '确定',
                    callback: action => {
                        axios.get(url, {
                            params: {}
                        }).then(data => {
                            this.notEmmitNum += Number(data.data);
                            this.$message({
                                message: '获取成功!',
                                type: 'success'
                            });
                        }).catch(err => {
//                        this.$message.closeAll();
                            this.$message.error("" + err.response.data.message);
                        });
                    }
                });
            },
            //        获取未分配的任务数量
            getUnassignedTask() {
                return axios.get('/unassignedTasks', {
                    params: {}
                });
            },
            //        获取医生列表
            getDoctorList() {
                return axios.get('/doctorList', {
                    params: {}
                });
            },
            //获取未完成任务数量
            getUnResolvedNum(doctorId) {
                let url = "/task/newTasksSum/" + doctorId;
                axios.get(url, {
                    params: {}
                }).then((data) => {
                    this.unResolvedNum = Number(data.data);
                }).catch((err) => {
//               this.$message.closeAll();
                    this.$message.error("" + err.response.data.message);
                });
            },
            //        获取任务列表
            getTaskData() {
                this.taskLoading = true;
                let doctorId = localStorage.getItem('doctorId');
                let url = '/task/newTasks/' + doctorId + '/' + this.taskPageIndex + '/10';
                axios.get(url, {
                    params: {}
                }).then(taskData => {
                    this.taskLoading = false;
                    if (taskData.data.list) {
                        taskData.data.list.map(item => {
                            if (!item.updateTime) {
                                item.updateTime = '暂无';
                            }
                        });
                        this.taskData = taskData.data.list;
                        this.taskPageSize = taskData.data.totalSize || 1;
                    }
                }).catch(err => {
                    this.taskLoading = false;
//                this.$message.closeAll();
                    this.$message.error("" + err.response.data.message);
                });
            },
            //        获取被审核任务列表
            getAuditorTaskData() {
                this.auditorLoading = true;
                let doctorId = localStorage.getItem('doctorId');
                let url = '/task/auditedTasks/' + doctorId + '/' + this.auditorPageIndex + '/10';
                axios.get(url, {
                    params: {}
                }).then(reviewData => {
                    this.auditorLoading = false;
                    if (reviewData.data.list) {
                        reviewData.data.list.map(item => {
                            if (!item.updateTime) {
                                item.updateTime = '暂无';
                            }
                        });
                        this.taskReviewData = reviewData.data.list;
                        this.auditorPageSize = reviewData.data.totalSize || 1;
                    }
                }).catch((err) => {
                    this.auditorLoading = false;
//                this.$message.closeAll();
                    this.$message.error("" + err.response.data.message);
                });
            },
            //        获取被打回任务列表
            getRejectTaskData() {
                this.rejectLoading = true;
                let doctorId = localStorage.getItem('doctorId');
                let url = '/task/repulseTasks/' + doctorId + '/' + this.repulsePageIndex + '/10';
                axios.get(url, {
                    params: {}
                }).then(rejectData => {
                    this.rejectLoading = false;
                    if (rejectData.data.list) {
                        rejectData.data.list.map(item => {
                            if (!item.updateTime) {
                                item.updateTime = '暂无';
                            }
                        });
                        this.taskRejectData = rejectData.data.list;
                        this.repulsePageSize = rejectData.data.totalSize || 1;
                    }
                }).catch((err) => {
                    this.rejectLoading = false;
//                this.$message.closeAll();
                    this.$message.error("" + err.response.data.message);
                });
            },
            getResolvedTaskDataSigle(url) {
                axios.get(url, {
                    params: {}
                }).then(resolveData => {
                    this.resolveLoading = false;
                    if (resolveData.data.list) {
                        resolveData.data.list.map(item => {
                            if (!item.updateTime) {
                                item.updateTime = '暂无';
                            }
                        });
                        this.taskFinishedData = resolveData.data.list;
                        this.resolvePageSize = resolveData.data.totalSize || 1;
                    }
                }).catch(err => {
                    this.resolveLoading = false;
//                this.$message.closeAll();
                    this.$message.error("" + err.response.data.message);
                });
            },
            //        获取已完成任务列表
            getResolvedTaskData() {
                this.resolveLoading = true;
                let doctorId = localStorage.getItem('doctorId');
                let url = '/task/finishedTasks/' + doctorId + '/' + this.resolvePageIndex + '/10';
                this.getResolvedTaskDataSigle(url);
            },
            //        获取他人完成任务列表
            getResolvedOther() {
                this.resolveLoading = true;
                let url = '/task/finishedTasks/' + this.doctorId + '/' + this.resolvePageIndex + '/10';
                this.getResolvedTaskDataSigle(url);
                let doctorId = this.doctorId.toString();
                this.getUnResolvedNum(doctorId);
            },
            //        分配任务给医生
            assignTask() {
                let url = '/allocateTask/' + this.doctorId + "/" + this.emmitNum;
                axios.get(url, {
                    params: {}
                }).then(data => {
                    this.notEmmitNum -= Number(data.data);
                    this.$message({
                        message: '分配成功!',
                        type: 'success'
                    });
                    let docId = localStorage.getItem('doctorId');
                    if (this.doctorId == Number(docId)) {
                        this.getTaskData();
                    }
                }).catch(err => {
                    this.$message.error("" + err.response.data.message);
                });
            },
            getAllData(ifAuditor) {
                if (ifAuditor) {
                    this.getAuditorTaskData();
                } else {
                    this.getTaskData();
                    this.getRejectTaskData();
                    this.getResolvedTaskData();
                }
            },
            refreshAll() {
                let doctorId = localStorage.getItem('doctorId');
                this.getAllData(this.ifAuditor);
                this.getUnResolvedNum(doctorId);
            },
            changeDoctId(val){
                this.doctorId = val;
            },
            changeDoctorOption(val) {
                this.doctorId = val;
                this.judgeDisAssign();
            }
        },
        mounted() {
            localStorage.setItem('doctorId', '9090');
            localStorage.setItem('role', 'ADMIN');
            localStorage.setItem('token', 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiLpq5jkupEiLCJleHAiOjE1MzM3ODYyODQsImlhdCI6MTUzMzY5OTg4NH0.pzbVGn8_0hO-VA1Rhe1pnYvNT25UgH26fH9IAIPFoY9bE795tAcg9VZO2JD9S44zegTosZDyWHArEx79kfZD-g');
            let level = localStorage.getItem('role');
            axios.defaults.headers.common['Authorization'] = localStorage.getItem('token');
            let doctorId = localStorage.getItem('doctorId');
            switch (level) {
                case 'ANNOTATE':
                    this.personLevel = 1;
                    break;
                case 'ADMIN':
                    this.personLevel = 0;
                    break;
                case 'AUDITOR':
                    this.personLevel = 1;
                    this.ifAuditor = true;
                    this.activeName = 'fourth';
                    break;
                default:
                    break;
            }
            axios.all([this.getUnassignedTask(), this.getDoctorList()])
                .then(axios.spread((unsignedData, doctorList) => {
                    if (unsignedData.data) {
                        this.notEmmitNum = unsignedData.data;
                    }
                    if (doctorList.data) {
                        doctorList.data.map(item => {
                            this.doctorOptions.push({
                                value: item.id,
                                id: item.id,
                                label: item.name
                            });
                        });
                    }
                })).catch(err => {
                this.$message.error("" + err.response.data.message);
            });
            this.getAllData(this.ifAuditor);
            this.getUnResolvedNum(doctorId);
        }
    }
</script>

<style scoped>
    .contentBox {
        position: relative;
        overflow: hidden;
        min-height: 100%;
        background-color: #fff;
        width: 100%
    }

    .title {
        font-size: 14px;
        overflow: hidden;
        margin: 20px 10px;
        height: 32px;
        line-height: 32px;
        border-left: 2px solid #88b7e0;
        padding-left: 10px;
    }

    .pullLeft {
        float: left;
    }

    .pullRight {
        float: right;
    }

    .operateBox {
        background-color: #e4e4e4;
        padding: 10px;
        margin: 0 5px;
        border-radius: 4px;
    }

    .normalInp {
        width: 200px;
    }

    .normalText {
        margin-left: 20px;
        letter-spacing: 2px;
    }

    .orange {
        color: #e58121;
    }

    .marginBottom {
        margin-bottom: 5px;
    }

    .taskContent {
        padding: 10px;
    }
</style>
