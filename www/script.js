function $(id){ return document.getElementById(id);}
function isOperator(c){ return ['+','-','*','/','^'].includes(c);}
function precedenceOf(op){ if(op==='+'||op==='-')return 1; if(op==='*'||op==='/')return 2; if(op==='^')return 3; return 0;}

/* ---------------- Stack Rendering ---------------- */
function renderStack(containerId, stepObj, type){
  const container = $(containerId);
  container.innerHTML='';
  const stack = stepObj.stack || [];
  const highlight = stepObj.highlight;

  for(let idx = 0; idx < stack.length; idx++){
    const row = document.createElement('div'); row.className='stack-row';

    const colMid = document.createElement('div'); colMid.className='col-middle';
    const item = document.createElement('div'); item.className='stack-item';
    item.textContent = stack[idx];
    if(String(stack[idx])===String(highlight)) item.classList.add('highlight');
    colMid.appendChild(item);

    const colIdx = document.createElement('div'); colIdx.className='col-index';
    colIdx.textContent = `[${idx}]`;
    if(idx===stack.length-1) colIdx.textContent += '  ← TOP';

    row.appendChild(colMid);
    row.appendChild(colIdx);
    container.appendChild(row);
  }

  if(type==='conversion'){
    if($('outputConv')) $('outputConv').textContent = stepObj.output || '';
    if($('convStepDesc')) $('convStepDesc').textContent = stepObj.desc || '';
  } else if(type==='evaluation'){
    if($('outputEval')) $('outputEval').textContent = stepObj.output ? stepObj.output.join(' ') : '';
    if($('evalStepDesc')) $('evalStepDesc').textContent = stepObj.desc || '';
  }
}

/* ---------------- Conversion Logic ---------------- */
let convSteps=[], convIndex=-1;
function pushConv(stack, output, highlight, desc){ convSteps.push({stack:[...stack], output:output, highlight, desc}); }

function generateStepsInfixToPostfix(expr){
  convSteps=[]; let stack=[]; let output='';
  for(const ch of expr){
    if(/\s/.test(ch)) continue;
    if(/[A-Za-z0-9]/.test(ch)){
      output+=ch;
      pushConv(stack, output.split('').join(' '), ch, `Read operand '${ch}' → append to output`);
    } else if(ch==='('){ stack.push(ch); pushConv(stack, output.split('').join(' '), ch, `Push '('`);}
    else if(ch===')'){
      while(stack.length && stack[stack.length-1]!=='('){ const p=stack.pop(); output+=p; pushConv(stack, output.split('').join(' '), p, `Pop '${p}' → append to output`);}
      if(stack.length && stack[stack.length-1]==='('){stack.pop(); pushConv(stack, output.split('').join(' '), '(', `Pop '('`);}
    } else if(isOperator(ch)){
      while(stack.length && isOperator(stack[stack.length-1]) && precedenceOf(stack[stack.length-1])>=precedenceOf(ch)){ const p=stack.pop(); output+=p; pushConv(stack, output.split('').join(' '), p, `Pop '${p}' → append`);}
      stack.push(ch); pushConv(stack, output.split('').join(' '), ch, `Push operator '${ch}'`);
    }
  }
  while(stack.length){ const p=stack.pop(); output+=p; pushConv(stack, output.split('').join(' '), p, `Pop remaining '${p}' → append`);}
}

function generateStepsInfixToPrefix(expr){
  convSteps=[]; const rev=expr.split('').reverse().map(c=>c==='('?')':c===')'?'(':c).join('');
  generateStepsInfixToPostfix(rev);
  if(convSteps.length){
    const last=convSteps[convSteps.length-1].output.replace(/\s/g,'');
    const prefix=last.split('').reverse().join('');
    convSteps.push({stack:[], output:prefix.split('').join(' '), highlight:'', desc:`Final Prefix result: ${prefix}`});
  }
}

function generateStepsPostfixToInfix(expr){
  convSteps=[]; let stack=[]; const tokens=expr.includes(' ')?expr.split(' ').filter(t=>t!==''):expr.split('');
  for(const t of tokens){
    if(/[A-Za-z0-9]/.test(t)){stack.push(t); pushConv(stack, stack[stack.length-1], t, `Push operand '${t}'`);}
    else if(isOperator(t)){ const b=stack.pop(); const a=stack.pop(); const newExp=`(${a}${t}${b})`; stack.push(newExp); pushConv(stack, stack[stack.length-1], newExp, `Pop '${a}', '${b}' → push '${newExp}'`);}
  }
}

function generateStepsPrefixToInfix(expr){
  convSteps=[]; let stack=[]; const tokens=expr.includes(' ')?expr.split(' ').filter(t=>t!==''):expr.split('');
  for(let i=tokens.length-1;i>=0;i--){const t=tokens[i]; if(/[A-Za-z0-9]/.test(t)){stack.push(t); pushConv(stack, stack[stack.length-1], t, `Push operand '${t}'`);}
    else if(isOperator(t)){ const a=stack.pop(); const b=stack.pop(); const newExp=`(${a}${t}${b})`; stack.push(newExp); pushConv(stack, stack[stack.length-1], newExp, `Pop '${a}', '${b}' → push '${newExp}'`);}
  }
}

function prepareConversion(){
  resetConversion();
  const expr=$('convExpr').value.trim(), type=$('convType').value;
  if(!expr){ alert('Enter expression to convert'); return; }
  if(type==='infixToPostfix') generateStepsInfixToPostfix(expr);
  else if(type==='infixToPrefix') generateStepsInfixToPrefix(expr);
  else if(type==='postfixToInfix') generateStepsPostfixToInfix(expr);
  else if(type==='prefixToInfix') generateStepsPrefixToInfix(expr);
  convIndex=convSteps.length?0:-1;
  if(convIndex>=0){ const step=convSteps[convIndex]; renderStack('stackContainerConv', step, 'conversion'); $('convStepsBox').textContent=`${convSteps.length} steps prepared.`; }
}

function nextConversion(){ if(convSteps.length && convIndex<convSteps.length-1){ convIndex++; const step=convSteps[convIndex]; renderStack('stackContainerConv', step, 'conversion'); $('convStepsBox').textContent=`Step ${convIndex+1}/${convSteps.length}`;} }
function prevConversion(){ if(convSteps.length && convIndex>0){ convIndex--; const step=convSteps[convIndex]; renderStack('stackContainerConv', step, 'conversion'); $('convStepsBox').textContent=`Step ${convIndex+1}/${convSteps.length}`;} }
function resetConversion(){ convSteps=[]; convIndex=-1; $('stackContainerConv').innerHTML=''; $('outputConv').textContent='Output / built expression'; $('convStepDesc').textContent='Step info will appear here.'; $('convStepsBox').textContent='Conversion steps appear here after "Prepare Steps".'; clearInterval(convInterval); convPlaying=false; $('playConvBtn').textContent='Play';}

/* ---------------- Evaluation Logic ---------------- */
let evalSteps=[], evalIndex=-1;
function applyOpNum(a,b,op){const x=parseFloat(a),y=parseFloat(b);let r=0;switch(op){case '+':r=x+y;break;case '-':r=x-y;break;case '*':r=x*y;break;case '/':r=y===0?Infinity:x/y;break;case '^':r=Math.pow(x,y);break;default:r=NaN;} if(Number.isFinite(r)&&Math.abs(r-Math.round(r))<1e-12)return String(Math.round(r)); return String(Number.isFinite(r)?Number(r.toFixed(6)):r);}

function generatePostfixEvalSteps(tokens){
  const steps=[], stack=[];
  for(const t of tokens){ if(t==='')continue; if(!isNaN(t)){stack.push(t); steps.push({stack:[...stack], output:[...stack], highlight:t, desc:`Push ${t}`}); }
    else if(isOperator(t)){ const b=stack.pop(), a=stack.pop(); steps.push({stack:[...stack], output:[...stack], highlight:b, desc:`Pop ${a} and ${b}`}); const res=applyOpNum(a,b,t); stack.push(res); steps.push({stack:[...stack], output:[...stack], highlight:res, desc:`Compute ${a} ${t} ${b} = ${res}`});} 
  }
  if(stack.length) steps.push({stack:[...stack], output:[...stack], highlight:stack[stack.length-1], desc:`Final result = ${stack[stack.length-1]}`});
  return steps;
}

function generatePrefixEvalSteps(tokens){
  const steps=[], stack=[];
  for(let i=tokens.length-1;i>=0;i--){const t=tokens[i]; if(t==='')continue; if(!isNaN(t)){stack.push(t); steps.push({stack:[...stack], output:[...stack], highlight:t, desc:`Push ${t}`});} else if(isOperator(t)){ const a=stack.pop(),b=stack.pop(); steps.push({stack:[...stack], output:[...stack], highlight:a, desc:`Pop ${a} and ${b}`}); const res=applyOpNum(a,b,t); stack.push(res); steps.push({stack:[...stack], output:[...stack], highlight:res, desc:`Compute ${a} ${t} ${b} = ${res}`});}}
  if(stack.length) steps.push({stack:[...stack], output:[...stack], highlight:stack[stack.length-1], desc:`Final result = ${stack[stack.length-1]}`});
  return steps;
}

function generateInfixEvalSteps(expr){
  const tokens=[]; const regex=/\d+(\.\d+)?|\+|\-|\*|\/|\^|\(|\)/g; let m;
  while((m=regex.exec(expr))!==null) tokens.push(m[0]);
  const out=[], ops=[];
  for(const t of tokens){ if(!isNaN(t)) out.push(t); else if(t==='(') ops.push(t); else if(t===')'){while(ops.length&&ops[ops.length-1]!=='(') out.push(ops.pop()); ops.pop();} else{ while(ops.length&&precedenceOf(ops[ops.length-1])>=precedenceOf(t)) out.push(ops.pop()); ops.push(t); } }
  while(ops.length) out.push(ops.pop());
  return generatePostfixEvalSteps(out);
}

function prepareEvaluation(){
  resetEvaluation();
  const expr=$('evalExpr').value.trim(), type=$('evalType').value;
  if(!expr){ alert('Enter expression'); return; }
  const tokens=expr.split(' ');
  if(type==='postfix') evalSteps=generatePostfixEvalSteps(tokens);
  else if(type==='prefix') evalSteps=generatePrefixEvalSteps(tokens);
  else if(type==='infix') evalSteps=generateInfixEvalSteps(expr);
  evalIndex=evalSteps.length?0:-1;
  if(evalIndex>=0){ const step=evalSteps[evalIndex]; renderStack('stackContainerEval', step, 'evaluation'); $('evalStepsBox').textContent=`${evalSteps.length} steps prepared.`; }
}

function nextEvaluation(){ if(evalSteps.length&&evalIndex<evalSteps.length-1){ evalIndex++; const step=evalSteps[evalIndex]; renderStack('stackContainerEval', step, 'evaluation'); $('evalStepsBox').textContent=`Step ${evalIndex+1}/${evalSteps.length}`;} }
function prevEvaluation(){ if(evalSteps.length&&evalIndex>0){ evalIndex--; const step=evalSteps[evalIndex]; renderStack('stackContainerEval', step, 'evaluation'); $('evalStepsBox').textContent=`Step ${evalIndex+1}/${evalSteps.length}`;} }
function resetEvaluation(){ evalSteps=[]; evalIndex=-1; $('stackContainerEval').innerHTML=''; $('outputEval').textContent='Stack / result'; $('evalStepDesc').textContent='Step info will appear here.'; $('evalStepsBox').textContent='Evaluation steps appear here after "Prepare Evaluation".'; clearInterval(evalInterval); evalPlaying=false; $('playEvalBtn').textContent='Play';}

/* ---------------- Animation Control ---------------- */
let convPlaying=false, convInterval=null;
function togglePlayConversion(){
  if(convPlaying){ clearInterval(convInterval); convPlaying=false; $('playConvBtn').textContent='Play'; }
  else{
    convPlaying=true; $('playConvBtn').textContent='Pause';
    convInterval=setInterval(()=>{
      if(convIndex<convSteps.length-1) nextConversion();
      else { clearInterval(convInterval); convPlaying=false; $('playConvBtn').textContent='Play'; }
    }, 1000);
  }
}

let evalPlaying=false, evalInterval=null;
function togglePlayEvaluation(){
  if(evalPlaying){ clearInterval(evalInterval); evalPlaying=false; $('playEvalBtn').textContent='Play'; }
  else{
    evalPlaying=true; $('playEvalBtn').textContent='Pause';
    evalInterval=setInterval(()=>{
      if(evalIndex<evalSteps.length-1) nextEvaluation();
      else { clearInterval(evalInterval); evalPlaying=false; $('playEvalBtn').textContent='Play'; }
    }, 1000);
  }
}
