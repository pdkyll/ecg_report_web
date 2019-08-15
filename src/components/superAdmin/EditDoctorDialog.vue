<template>
    <div class="editDialog">
        <el-dialog :visible="dialogVisible" width="1000px"
                   :before-close="initDialog">
            <span class="dialogText">医生名称:</span>
            <el-input v-model.trim="doctorName" placeholder="请输入" style="width: 217px"
                      @keyup.enter.native="getDoctorList(true)"></el-input>
            <span class="dialogText marginLeft">所属医院:</span>
            <ExpandTree
                    style="margin-right: 10px"
                    ref="expandTree"
                    v-if="hackResetExpandTree"
                    @selectValue="selectedHospital"
                    @focus="getHospitals"
                    @clear="clearHospitalId"
                    :forseValue="forseValue"
                    :treeData="treeData"
                    :loading="getHospitalLoading"
            ></ExpandTree>
            <span class="marginLeft">
                <el-button type="primary" @click.native="getDoctorList(true)">查询</el-button>
                <el-button @click.native="initDialog">取消</el-button>
            </span>
            <div v-loading="editDialogLoading">
                <el-table
                        ref="multipleTable"
                        :data="tableData"
                        v-if="hackResetTabel"
                        tooltip-effect="dark"
                        style="width: 100%"
                        @select-all="selectAll"
                        @sort-change="sortPage"
                        @select="handleSelectionChange">
                    <el-table-column
                            type="selection"
                            width="40">
                    </el-table-column>
                    <el-table-column :label="type==='ROLE_EDITOR'?'标注医生姓名': '审核医生姓名'"
                                     prop="doctorName"></el-table-column>
                    <el-table-column label="操作记录" prop="workNum"></el-table-column>
                    <el-table-column label="服务机构" prop="hospitalCount"></el-table-column>
                    <el-table-column label="所属医院" prop="doctorHospital"></el-table-column>
                    <el-table-column label="最后登录时间" prop="lastLoginTime" sortable="custom"></el-table-column>
                </el-table>
                <el-pagination
                        background
                        @size-change="handleSizeChange"
                        @current-change="handleCurrentChange"
                        :current-page="page"
                        :page-sizes="[10, 20, 30, 40]"
                        :page-size="limit"
                        layout="total, sizes, prev, pager, next, jumper"
                        :total="total">
                </el-pagination>
            </div>
            <div class="showTagBox">
                <el-tag
                        :key="tag.doctorId || tag.id"
                        v-for="tag in dynamicTags"
                        type="warning"
                        closable
                        :disable-transitions="false"
                        @close="handleClose(tag)">
                    {{tag.doctorName || tag.name}}
                </el-tag>
            </div>
        </el-dialog>
    </div>

</template>
<script>
    import {bus} from '../../bus';
    import PageManage from './PageManage';
    import API from '../../api/api_super_admin';
    import APIUser from '../../api/api_user';
    import ExpandTree from '../common/ExpandTree.vue';

    export default {
        mixins: [PageManage],
        props: ['setAuditors', 'setEditors'],
        components: {
            ExpandTree
        },
        data() {
            return {
                dialogVisible: false,
                doctorName: '',
                hackResetExpandTree: true,
                options: [{value: 'test', label: 'test'}],
                type: 'reporter',
                editDialogLoading: false,
                hackResetTabel: true,
                tableData: [],
                dynamicTags: [],
                selectTag: {},
                sortType: 'LAST_LOGIN_TIME',
                sortState: 'DOWN',
                forseValue: '',
                lastState: -1,
                hospital_id: null,
                getHospitalLoading: false,
                treeData: [],
            }
        },
        mounted() {
            bus.$off('openEditDoctorDialog');
            bus.$on('openEditDoctorDialog', (callback) => {
                this.handleOpenDialog();
                const typeMap = ['ROLE_EDITOR', 'ROLE_AUDITOR'];
                this.type = typeMap[callback.type];
                if (this.lastState !== callback) {
                    this.page = 1;
                    this.lastState = callback;
                }
                this.dynamicTags = callback.tags;
                this.editDialogLoading = true;
                this.getDoctorList();
            });
            bus.$off('closeTag');
            bus.$on('closeTag', (val) => {
                this.handleClose(val);
            });
            bus.$off('clearTags');
            bus.$on('clearTags', () => {
                this.dynamicTags = [];
                this.tableData = [];
            });
        },
        methods: {
            handleSelectionChange(val, changeRow) {
                if (this.dynamicTags === undefined) this.dynamicTags = [];
                let ifDelete = true;
                for (let i = 0; i < val.length; i++) {
                    if (val[i].doctorId === changeRow.doctorId) {
                        ifDelete = false;
                        break;
                    }
                }
                if (!ifDelete) {
                    val.map(row => {
                        row = {
                            id: row.doctorId,
                            name: row.doctorName,
                            nick_name: row.doctorNickName
                        };
                        let temp = this.dynamicTags.filter(item => item.id === row.id);
                        let index = -1;
                        this.dynamicTags.map((item, ind) => {
                            if (item.id === row.id) index = ind
                        });
                        if (temp.length === 0) {
                            this.dynamicTags.push(row)
                        }
                    });
                } else {
                    changeRow = {
                        id: changeRow.doctorId,
                        name: changeRow.doctorName,
                        nick_name: changeRow.doctorNickName
                    };
                    let temp = this.dynamicTags.filter(item => item.id === changeRow.id);
                    let index = -1;
                    this.dynamicTags.map((item, ind) => {
                        if (item.id === changeRow.id) index = ind
                    });
                    if (temp.length) {
                        this.dynamicTags.splice(index, 1)
                    }
                }
                if (this.type === 'ROLE_EDITOR') {
                    this.setEditors(this.dynamicTags);
                } else {
                    this.setAuditors(this.dynamicTags);
                }
            },
            selectAll(selection) {
                let spliceState = true;
                if (this.tableData.length === selection.length) {
                    spliceState = false;
                }
                this.tableData.map(row => {
                    row = {
                        id: row.doctorId,
                        name: row.doctorName,
                        nick_name: row.doctorNickName
                    };
                    let index = -1;
                    this.dynamicTags.map((item, ind) => {
                        if (item.id === row.id) index = ind
                    });
                    if (this.dynamicTags === undefined) this.dynamicTags = [];
                    let temp = this.dynamicTags.filter(item => item.id === row.id);
                    if (temp.length === 0) {
                        this.dynamicTags.push(row)
                    } else {
                        if (spliceState) {
                            this.dynamicTags.splice(index, 1);
                        }
                    }
                    if (this.type === 'ROLE_EDITOR') {
                        this.setEditors(this.dynamicTags);
                    } else {
                        this.setAuditors(this.dynamicTags);
                    }
                });
            },
            sortPage(val) {
                const orderMap = {
                    "descending": 'DOWN',
                    "ascending": 'UP'
                };
                this.page = 1;
                this.sortState = orderMap[val.order];
                this.sortType = 'LAST_LOGIN_TIME';
                this.getDoctorList();
            },
            handleClose(tag) {
                let index = -1;
                this.dynamicTags.map((item, ind) => {
                    if (item.id === tag.id) index = ind
                });
                this.dynamicTags.splice(index, 1);
                let exsist = false;
                for (let i = 0; i < this.tableData.length; i++) {
                    if (this.tableData[i].doctorId === tag.id) {
                        exsist = true;
                        break;
                    }
                }
                if (exsist) this.$refs.multipleTable.toggleRowSelection(this.tableData.find(item => item.doctorId === tag.id));
            },
            handleOpenDialog() {
                this.dialogVisible = true;
            },
            handleSizeChange(val) {
                this.limit = val;
                this.page = 1;
                this.getDoctorList();
            },
            handleCurrentChange(val) {
                this.page = val;
                this.getDoctorList();
            },
            clearHospitalId() {
                this.hospital_id = null;
                this.getDoctorList(true);
            },
            selectedHospital(val) {
                this.hospital_id = val.id;
                this.getDoctorList(true);
                // this.handleSearch();
            },
            getHospitals() {
                this.getHospitalLoading = true;
                APIUser.getInstitutions().then(res => {
                    this.treeData = res;
                }).finally(() => {
                    this.getHospitalLoading = false;
                })
            },
            initDialog() {
                this.doctorName = '';
                // this.tableData = [];
                this.forseValue = '';
                this.dialogVisible = false;
            },
            getDoctorList(forSearch = false) {
                forSearch ? this.page = 1 : null;
                this.editDialogLoading = true;
                API.getDoctors({
                    limit: this.limit,
                    page: this.page,
                    hospital_id: this.hospital_id,
                    name: this.doctorName,
                    type: this.type,
                    sort: this.sortType,
                    sort_state: this.sortState
                }).then(data => {
                    this.editDialogLoading = false;
                    this.tableData = data.doctorList;
                    this.hackResetTabel = false;
                    this.$nextTick(() => {
                        this.hackResetTabel = true;
                        this.$nextTick(() => {
                            if (this.dynamicTags) {
                                this.dynamicTags.map(rowItem => {
                                    let exsist = false;
                                    for (let i = 0; i < data.doctorList.length; i++) {
                                        if (rowItem.doctorId) {
                                            if (data.doctorList[i].doctorId === rowItem.doctorId) {
                                                exsist = true;
                                                break;
                                            }
                                        } else {
                                            if (data.doctorList[i].doctorId === rowItem.id) {
                                                exsist = true;
                                                break;
                                            }
                                        }
                                    }
                                    if (exsist) {
                                        if (rowItem.doctorId) {
                                            this.$refs.multipleTable.toggleRowSelection(data.doctorList.find(item => item.doctorId === rowItem.doctorId));
                                        } else {
                                            this.$refs.multipleTable.toggleRowSelection(data.doctorList.find(item => item.doctorId === rowItem.id));
                                        }
                                    }
                                });
                            }
                        });

                    });
                    this.total = data.totalCount;
                }).catch(err => {
                    this.editDialogLoading = false;
                })
            },
        }
    }
</script>
<style>
    .agentBox .el-dialog__body {
        padding: 9px 20px 30px 20px;
    }

    .agentBox .el-tag {
        margin: 3px;
    }
</style>
<style scoped>
    .dialogText {
        font-size: 14px;
        margin-right: 20px;
    }

    .marginLeft {
        margin-left: 30px;
    }

    .showTagBox {
        box-sizing: border-box;
        margin: 10px 0;
        border: 1px solid #ccc;
        min-height: 100px;
        border-radius: 4px;
    }
</style>