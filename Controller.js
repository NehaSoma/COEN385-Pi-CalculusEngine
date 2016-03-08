function main()
{
    getTextArea().value = "";
    var userInput = document.getElementById('userInput').value;
    if(userInput == "") {}
    else
    {
        userStrings = userInput.split('\n');
        userStrings.forEach(parseInput)
    }
}

function parseInput(userInput)
{
    console.log(userInput);
    variables.push([]);
    var paranCheckCount = 0;
    var eqSymPos = userInput.indexOf('=');
    for( index=0; index< userInput.length; index++){
        if(userInput[index] == '(') paranCheckCount++;
        else if (userInput[index] == ')') paranCheckCount--;
        if(paranCheckCount < 0){
            alert("Invalid Input Expression.");
            return
        }
    }
    if(paranCheckCount != 0){
        alert("Invalid Input Expression.");
        return
    }

    if (eqSymPos != -1) {
        var n = userInput.substring(0, eqSymPos);
        var m = findItem(n, methods);
        if (isNaN(m)) {
            m = new Method(n, input_count);
            methods.push(m);
        }
        m.program = getExpr(userInput.substring(equals + 1));
        return
    }

    var current = getExpr(userInput);
    if(Object.keys(current).length == 0){
        alert("Invalid Input Expression.");
        return
    }

    current.id = input_count++;
    verifyExec(current);
}

function getExpr(userString){
    userString = userString.trim();
    if (userString == "") {
        return NaN;
    }
    var ch = userString.indexOf('.');
    var parens = 0;
    if(ch != -1){
        parens = checkParans(ch);
        if (parens == 0) {
            thisexp = new FlowOp('DOT', input_count);
            thisexp.left = getExpr(userString.substring(0, ch));
            thisexp.right = getExpr(userString.substring(ch + 1));
            return thisexp;
        }
    }
    ch = userString.indexOf('+');
    if(ch != -1){
        parens = checkParans(ch);
        if (parens == 0) {
            thisexp = new FlowOp('PLUS', input_count);
            thisexp.left = getExpr(userString.substring(0, ch));
            thisexp.right = getExpr(userString.substring(ch + 1));
            return thisexp;
        }
    }
    ch = userString.indexOf('|');
    if(ch != -1){
        parens = checkParans(ch);
        if (parens == 0) {
            thisexp = new FlowOp('PIPE', input_count);
            thisexp.left = getExpr(userString.substring(0, ch));
            thisexp.right = getExpr(userString.substring(ch + 1));
            return thisexp;
        }
    }
    ch = userString.indexOf('?');
    if(ch != -1){
        parens = checkParans(ch);
        if (parens == 0) {
            thisexp = new IoOperations('READ', input_count);
            thisexp.channel = new Item(userString.substring(0, ch), 'CHANNEL');
            thisexp.list = getVars(userString.substring(ch+1), false);
            thisexp.io_id = in_out_id++;
            io_lists.push(thisexp.list);
            return thisexp;
        }
    }
    ch = userString.indexOf('!');
    if(ch != -1){
        parens = checkParans(ch);
        if (parens == 0) {
            thisexp = new IoOperations('WRITE', input_count);
            thisexp.channel = new Item(userString.substring(0, ch), 'CHANNEL');
            thisexp.list = getVars(userString.substring(ch+1), true);
            thisexp.io_id = in_out_id++;
            io_lists.push(thisexp.list);
            return thisexp;
        }
    }
    if (userString[0] == '(') {
        return get_expr(userString.substring(1, userString.length() - 2));
    }
    ch = userString.indexOf("new(");
    if (ch != -1) {
        exp = new Keyword('NEW', input_count);
        exp.list = getChannels(userString.substring(4, userString.length - 1));
        return exp;
    }
    ch = userString.indexOf("print(");
    if (ch != -1) {
        exp = new Keyword('PRINT', input_count);
        exp.list = getVars(userString.substring(6, userString.length - 1), true);
        exp.io_id = in_out_id++;
        io_lists.push(exp.list);
        return exp;
    }
    if (userString[0] >= 'A' || userString[0] <= 'Z') {
        var m = findItem(userString, methods);
        if (isNaN(m)) alert("Method " + userString + " does not exist");
        else return m;
    }
    function checkParans(ch){
        parens = 0;
        for (index = 0; index < ch; index++) {
            if (userString[index] == '(') parens++;
            else if (userString[index] == ')') parens--;
        }
        return parens;
    }
    return NaN;
}

function getVars(data, allowStrings){
    if (data[0] == '(') return getVars(data.substring(1, data.length - 2), allowStrings);

    var variablesList = [];
    var text = "";
    for(index=0; index < data.length; index++){
        if (data[index] == '"' || data[index] == '\'') {
            var stop = data[index++];
            text = "";
            while (data[index] != stop)
                text += data[index++];
            if(allowStrings)
                variablesList.push(new Item(text, 'STRING'));
            text = "";
            index++;
        }
        else if (data[index] == ',') {
            if (text.length > 0) {
                variablesList.push(new Item(text, 'VARIABLE'));
                variables[input_count].push(new Item(text, 'VARIABLE'));
            }
            text = "";
        }
        else
            text += data[index];
    }

    if (text.length > 0) {
        variablesList.push(new Item(text, 'VARIABLE'));
        variables[input_count].push(new Item(text, 'VARIABLE'));
    }

    return variablesList;
}

function getChannels(data){
    if (data[0] == '(') return getChannels(data.substr(1, data.length - 2));

    var ch = [];
    text = "";
    for(i = 0; i < data.length; i++) {
        if (data[i] == ',') {
            ch.push(new Item(text, 'CHANNEL'));
            text = "";
        }
        else
            text += data[i];
    }

    if (text.length > 0)
        ch.push(new Item(text, 'CHANNEL'));
    return ch;
}

function reRun(halted){
    var max = write_halted.length + read_halted.length;
    for(index=0; index < max; index++){
        var tmp = halted;
        halted.clear();
        while(!tmp.empty)
        {
            verifyExec(tmp[tmp.length]);
            tmp.pop();
        }
    }
}

function verifyExec(prog, add){
    add = add || NaN;
    prog.run();
    if(read_halt){
        read_halted.push(!isNaN(add) ? add : prog);
        read_halt = false;
        reRun(write_halted);
        return false;
    }
    if(write_halt){
        write_halted.push(!isNaN(add) ? add : prog);
        write_halt = false;
        return false;
    }
    return true;
}

function deRef(exp){
    retVal = exp;
    while(retVal.mainType == 'METHOD')
        retVal = retVal.program;
    return retVal
}

function findItem(itemType, itemList){
    for(index=0; index < itemList.length; index++){
        if(itemList[index].itemType == itemType)
            return itemList[index];
    }
    return NaN;
}

function findMethod(item, methodList){
    for(index=0; index < methodList.length; index++){
        if(methodList[index].name == item.name)
            return methodList[index];
    }
    return NaN;
}

function getTextArea(){
    return document.getElementById('outputTextArea')
}