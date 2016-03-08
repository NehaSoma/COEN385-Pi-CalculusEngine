
// Allowed Item types { CHANNEL, VARIABLE, STRING }
function Item(data, type)
{
    this.itemType = type;
    this.queue = [];
    if(type == 'STRING'){
        this.data = data;
        this.data_set = true;
    }
    else {
        this.name = data;
        this.data_set = false;
    }
}

Item.prototype.set = function (data){
    this.data = data;
    this.data_set = true;
};

var channels = [];
var variables = [];
var methods = [];

// Allowed expression types { METHOD, INOUT, FLOW, KEYWORD, EMPTY }
function Expression() {
    this.mainType = '';
    this.id = '';
}

Expression.prototype.run = function (){
    console.log("Undefined Function.")
};

var input_count = 0;
var in_out_id = 0;
var io_lists = [];
var read_halt = false;
var write_halt = false;
var read_ready = false;
var read_halted = [];
var write_halted = [];

// Allowed Operations { READ, WRITE }
function IoOperations(type, id){
    Expression.call();
    this.mainType = 'INOUT';
    this.id = id;
    this.type = type;
    this.io_id = NaN;
    this.channel = '';
    this.list = [];
}

IoOperations.prototype.run = function (){
    ch = findMethod(this.channel, channels);
    if(ch.length == 0) {
        console.log("Channel Not Found :"+this.channel.toString());
        return
    }

    if(this.list.length == 0)
        list = io_lists[io_id];

    if(this.type == 'READ' && this.list.length != 0){
        if(ch.stream.length != 0){
            var it = findItem(this.list[0], variables[this.id]);
            var st = ch.stream[0]; ch.stream.shift();

            if(!isNaN(findItem(this.list[0], channels))){
                alert("Channel already exists ! Cannot create variable with name " + this.list[0].name);
                return
            }

            if(isNaN(it)){
                alert("Variable doesn't exist with name " + this.list[0].name);
                return
            }

            it.set(st.data);
            this.list.shift();
        }
        if(!list.empty) read_halt = true;
    }
    else if(this.type == 'WRITE' && ! this.list.empty){
        if(!read_halted.empty || read_ready) {
            if(this.list[0].type == 'STRING'){
                ch.stream.push(this.list[0]);
                this.list.shift();
            }
            else {
                it = findItem(this.list[0], variables[this.id]);
                if(! isNaN(findItem(this.list[0], channels))){
                    alert("Cannot Send channels");
                    return
                }
                if(isNaN(it)){
                    alert("Variable dosen't exist with name " + this.list[0].name);
                    return
                }
                if(!it.data_set){
                    alert("Data not available for sending in " + it.name);
                    return
                }
                ch.stream.push(it);
                this.list.shift();
            }
            reRun(read_halted);
        }
        if(! this.list.empty) write_halt = true;
    }
};

IoOperations.prototype.isDone = function(){
    return this.list.empty
};

function Keyword(type, id){
    Expression.call();
    this.type = type;
    this.io_id = id;
    this.list = [];
}

Keyword.prototype.run = function(){
    ta = getTextArea();
    if(this.list.length == 0)
        this.list = io_lists[this.io_id];

    if(this.type == 'PRINT'){
        while(this.list.length != 0){
            if(this.list[0].itemType == 'STRING'){
                ta.value = ta.value + this.list[0].data + '\n';
            }
            else {
                var item = findItem(this.list[0], variables[this.id]);
                if(!isNaN(item)){
                    if(item.data_set)
                        ta.value = ta.value + this.list[0].data + '\n';
                    else {
                        alert("Variable "+ this.list[0].name + "has no value.");
                    }
                }
                else {
                    var itc = findItem(this.list[0], channels);
                    if(!isNaN(itc))
                        console.log("Cannot print channels.");
                    else
                        ta.value = ta.value + "Variable " + this.list[0].name + " has no value" + '\n';
                }
            }
            this.list.shift()
        }
    }
    else if (this.type == 'NEW'){
        while(this.list.length != 0){
            if(isNaN(findItem(this.list[0], channels))){
                if(!isNaN(findItem(this.list[0], variables[this.id]))){
                    console.log("Variable already exists. Can't create channel named " + this.list[0].name);
                }
                else {
                    channels.push(this.list[0]);
                }
            }
            this.list.shift();
        }
    }
};

// Allows only { PIPE, DOT, PLUS }
function FlowOp(type, id){
    Expression.call();
    this.type = type;
    this.id = id;
    this.mainType = 'FLOW';
    this.left = '';
    this.right = '';
}

FlowOp.prototype.run = function(){
    if(this.type == 'PIPE'){
        var listTodo = [];
        var added = true;
        listTodo.push(deRef(this.left));
        listTodo.push(deRef(this.right));

        while(added) {
            added = false;
            for (i = 0; i < listTodo.length; i++) {
                if (listTodo[i].mainType == 'FLOW' && listTodo[i].type == 'PIPE') {
                    listTodo.push(deRef(listTodo[i].left));
                    listTodo.push(deRef(listTodo[i].right));
                    listTodo.splice(i--, 1);
                    added = true;
                }
            }
        }

        for (i = 0; i < listTodo.length; i++) {
            if (listTodo[i].mainType == 'KEYWORD' && listTodo[i].type == 'NEW'){
                listTodo[i].run();
                listTodo.splice(i--, 1);
            }
        }

        for (i = 0; i < listTodo.length; i++) {
            if (listTodo[i].mainType == 'INOUT' && listTodo[i].type == 'READ'){
                verifyExec(listTodo[i]);
                listTodo.splice(i--, 1);
            }
        }

        for (i = 0; i < listTodo.length; i++) {
            if (listTodo[i].mainType == 'INOUT' && listTodo[i].type == 'WRITE'){
                verifyExec(listTodo[i]);
                listTodo.splice(i--, 1);
            }
        }

        for (i = 0; i < listTodo.length; i++) {
            if (listTodo[i].mainType == 'KEYWORD' && listTodo[i].type == 'PRINT'){
                listTodo[i].run();
                listTodo.splice(i--, 1);
            }
        }

        for (i = 0; i < listTodo.length; i++) {
            listTodo[i].run();
        }
    }
    else if(this.type == 'DOT'){
        if(verifyExec(this.left, this))
            verifyExec(this.right)
    }
    else if(this.type == 'PLUS'){
        if(Math.random()%2)
            verifyExec(this.left);
        else
            verifyExec(this.right);
    }
};

function Method(name, id){
    Expression.call();
    this.name = name;
    this.id = id;
    this.mainType = 'METHOD';
}

Method.prototype.run = function(){
    verifyExec(this.program)
};

function Empty(){
    Expression.call()
}

Empty.prototype.run = function(){};