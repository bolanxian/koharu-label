var S=(c,f,m)=>{if(!f.has(c))throw TypeError("Cannot "+m)};var a=(c,f,m)=>(S(c,f,"read from private field"),m?m.call(c):f.get(c)),E=(c,f,m)=>{if(f.has(c))throw TypeError("Cannot add the same private member more than once");f instanceof WeakSet?f.add(c):f.set(c,m)},u=(c,f,m,O)=>(S(c,f,"write to private field"),O?O.call(c,m):f.set(c,m),m);var b=(c,f,m)=>(S(c,f,"access private method"),m);(function(){var y,l,w,x,F,B,A,T;"use strict";const c=Object.freeze({int8:Int8Array,uint8:Uint8Array,int16:Int16Array,uint16:Uint16Array,int32:Int32Array,uint32:Uint32Array,int64:BigInt64Array,uint64:BigUint64Array,float32:Float32Array,float64:Float64Array,uint8Clamped:Uint8ClampedArray}),f=Object.getPrototypeOf(Uint8Array),m=f.prototype,O=p=>p instanceof f,C=new Map,$=new Map,V=p=>C.has(p);for(const[p,t]of Object.entries(c))$.set(t,p),C.set(p,t);const{call:q}=Function.prototype,M=(p,t)=>p*t,v=q.bind(m.subarray);class d extends Array{static isNdarray(t,e,r){return t instanceof d?r==null?t.ndim===e:t.ndim===e&&t.buffer instanceof c[r]:t instanceof f?r==null?e===1:e===1&&t instanceof c[r]:!1}static*xreshape(t,e,r){const n=e.slice(1),s=n.reduce(M,1),i=e[0];let o=0;for(;o<i&&r<t.length;o++,r+=s)yield this._reshape(t,n,r)}static _reshape(t,e,r){if(e.length>1){const n=d.from(d.xreshape(t,e,r));return n.buffer=t,n.shape=Object.freeze(e),n.offset=r,Object.freeze(n)}else return r===0&&e[0]===t.length?t:v(t,r,r+e[0])}static create(t,e,r=0){typeof e=="string"?e=e.split(",").map(Number):typeof e=="number"&&(e=[e]);let n,s;return V(t)?(n=c[t],s=new n(e.reduce(M,1)),r=0):O(t)?s=t:(n=t,s=new n(e.reduce(M,1)),r=0),this._reshape(s,e,r)}constructor(t){super(t)}get ndim(){return this.shape.length}slice(t=0,e=this.length){return d.unpack(d.pack(this.subarray(t,e)))}subarray(t=0,e=this.length){t<0&&(t+=this.length);let r=super.slice(t,e);r.buffer=this.buffer;let n=this.shape.slice();return n[0]=r.length,r.shape=Object.freeze(n),r.offset=this.offset+t*n.slice(1).reduce(M,1),Object.freeze(r)}reshape(t){return arguments.length>1&&(t=[...arguments]),d.create(this.buffer,t,this.offset)}toBuffer(){const{buffer:t,shape:e,offset:r}=this,n=e.reduce(M);return r===0&&n===t.length?t:v(t,r,r+n)}static pack(t){let e,r;O(t)?(e=t,r=[e.length]):(e=t.toBuffer(),r=t.shape.slice());const{buffer:n,byteOffset:s,byteLength:i,constructor:o}=e;return{shape:r,dtype:$.get(o),buffer:new Uint8Array(n,s,i)}}static unpack(t){const{buffer:e,shape:r,dtype:n}=t,{byteOffset:s,byteLength:i}=e,o=C.get(n);return this.create(new o(e.buffer.slice(s,s+i)),r)}}Object.assign(d.prototype,{[Symbol.toStringTag]:d.name});let I,W,N,G;(async()=>{try{I=WebAssembly,W=I.compileStreaming,N=I.instantiate,I.Module.imports(await W(fetch("data:application/wasm;base64,AGFzbQEAAAA"))),G=!0}catch(p){throw G=!1,p}})();const z=p=>{if(p<0)throw new RangeError("invalid number")},{min:H}=Math,R=8,J=28;class j{#t;#e=0;#r;get buffer(){return this.#t}get pos(){return this.#e}get size(){return this.#r}constructor(t){typeof t=="number"?(this.#t=new Uint8Array(t),this.#r=0):(this.#t=new Uint8Array(t),this.#r=this.#t.byteLength)}#n(t){const e=this.#t.length;if(t>e){let r=e;r<1&&(r=8);do r+=H(r,65536);while(t>r);let n=this.#t;this.#t=new Uint8Array(r),this.#t.set(n)}}read(t){let{buffer:e}=t,r=0,n=this.#e;for(let s=0,i=t.length;s<i;s+=2){let o=t[s],h=t[s+1],g=new Uint8Array(e,o,h);if(n+=h,n>this.#r){g.set(new Uint8Array(this.#t.buffer,this.#e,this.#r-this.#e)),r+=this.#r-this.#e,this.#e=this.#r;break}g.set(new Uint8Array(this.#t.buffer,this.#e,h)),this.#e=n,r+=h}return r}write(t){let{buffer:e}=t,r=0,n=this.#e;for(let s=0,i=t.length;s<i;s+=2){let o=t[s],h=t[s+1];n+=h,n>this.#r&&(this.#r=n),this.#n(n),this.#t.set(new Uint8Array(e,o,h),this.#e),this.#e=n,r+=h}return r}seek(t,e){let r;switch(e){case 0:r=t;break;case 1:r=this.#e+t;break;case 2:r=this.#r+t;break;default:return-1}return r>=0&&(this.#e=r),r}getData(){return new Uint8Array(this.#t.buffer,0,this.#r)}getText(){return new TextDecoder().decode(new Uint8Array(this.#t.buffer,0,this.#r))}}let L=null,P;const D=class D{constructor(t){E(this,F);E(this,A);E(this,y,void 0);E(this,l,void 0);E(this,w,void 0);E(this,x,[]);if(L!==t)throw new TypeError("Illegal constructor.");u(this,y,t.exports),u(this,l,null),u(this,w,null),a(this,y)._initialize()}get memorySize(){return a(this,y).memory.buffer.byteLength}about(){try{return u(this,w,[null,new j(8)]),a(this,y)._get_info(),a(this,w)[1].getText().trim()}finally{u(this,w,null)}}dio(t,e,r=5,n=!1){const s=t.length;try{return u(this,l,[t]),b(this,F,B).call(this,e),z(a(this,y)._dio(s,e,r,n?1:0)),{f0:a(this,l)[2],time_axis:a(this,l)[1]}}finally{b(this,A,T).call(this)}}harvest(t,e,r=5,n=!1){const s=t.length;try{return u(this,l,[t]),b(this,F,B).call(this,e),z(a(this,y)._harvest(s,e,r,n?1:0)),{f0:a(this,l)[2],time_axis:a(this,l)[1]}}finally{b(this,A,T).call(this)}}stonemask(t,e,r,n){const s=t.length,i=e.length;try{return u(this,l,[t,r,e]),z(a(this,y)._stonemask(s,n,i)),a(this,l)[2]}finally{b(this,A,T).call(this)}}cheaptrick(t,e,r,n){const s=t.length,i=e.length;try{u(this,l,[t,r,e]),b(this,F,B).call(this,n);const o=a(this,y)._cheaptrick(s,n,i);return z(o),{spectrogram:a(this,l)[3],fft_size:o}}finally{b(this,A,T).call(this)}}d4c(t,e,r,n,s=0){const i=t.length,o=e.length;try{return u(this,l,[t,r,e]),b(this,F,B).call(this,n),z(a(this,y)._d4c(i,n,o,s)),{aperiodicity:a(this,l)[4]}}finally{b(this,A,T).call(this)}}wav2world(t,e,r=5){const{f0:n,time_axis:s}=this.dio(t,e,r),i=this.stonemask(t,n,s,e),{spectrogram:o,fft_size:h}=this.cheaptrick(t,i,s,e),{aperiodicity:g}=this.d4c(t,i,s,e);return{time_axis:s,f0:i,fft_size:h,spectrogram:o,aperiodicity:g}}synthesis(t,e,r,n,s=5){const i=t.length;try{if(i!=e.shape[0]||i!=r.shape[0])throw new TypeError(`Mismatched number of frames between F0 (${i}), spectrogram (${e.shape[0]}) and aperiodicty (${r.shape[0]})`);if(e.shape[1]!=r.shape[1])throw new TypeError(`Mismatched dimensionality (spec size) between spectrogram (${e.shape[1]}) and aperiodicity (${r.shape[1]})`);return u(this,l,[null,null,t,e,r]),z(a(this,y)._synthesis(i,(e.shape[1]-1)*2,n,s)),a(this,l)[0]}finally{b(this,A,T).call(this)}}wavread(t){try{u(this,l,[null]),u(this,w,[null,new j(8),null,new j(t)]);const e=a(this,y)._wavreadlength();if(e>0){const r=a(this,y)._wavread(e);if(r>0){const n=a(this,l)[0],s=a(this,l)[1];return{x:n,fs:r,nbit:s[1]}}}throw new TypeError(a(this,w)[1].getText().trim()||"Unknown Error")}finally{b(this,A,T).call(this)}}wavwrite(t,e){try{u(this,l,[t]),u(this,w,[null,new j(8),null,new j(256)]),a(this,y)._wavwrite(t.length,e);const r=a(this,w)[3];if(r.size>0)return new Blob([r.getData()],{type:"audio/wave"});throw new TypeError(a(this,w)[1].getText().trim()||"Unknown Error")}finally{b(this,A,T).call(this)}}};y=new WeakMap,l=new WeakMap,w=new WeakMap,x=new WeakMap,F=new WeakSet,B=function(t,e=0,r=0){a(this,y)._init_world(t,e,r)},A=new WeakSet,T=function(){u(this,l,null),u(this,w,null);for(const t of a(this,x))a(this,y)._destruct(t);u(this,x,[])},P=async t=>{const e=await N(t,{wasi_snapshot_preview1:{fd_read(i,o,h,g){const _=a(s,w)[i];if(_==null)return-R;let U=_.read(new Uint32Array(n,o>>>0,h*2));return new Uint32Array(n,g,1)[0]=U,0},fd_write(i,o,h,g){const _=a(s,w)[i];if(_==null)return-R;let U=_.write(new Uint32Array(n,o>>>0,h*2));return new Uint32Array(n,g,1)[0]=U,0},fd_seek(i,o,h,g){const _=a(s,w)[i];if(_==null)return-R;let U=_.seek(Number(o),h);return U<0?-J:(new BigUint64Array(n,g>>>0,1)[0]=BigInt(U),0)},fd_close(i){const o=a(s,w)[i];return o==null?-R:(o.seek(0,0),0)},proc_exit(i){throw new Error("exit with exit code "+i)}},env:{constructNotify(i){a(s,x)[a(s,x).length]=i},readFloat64Array(i,o,h){new Float64Array(n,o>>>0,h).set(a(s,l)[i])},writeFloat64Array(i,o,h){(a(s,l)[i]=new Float64Array(+h)).set(new Float64Array(n,o>>>0,h))},readFloat64Array2D(i,o,h,g){const _=new Uint32Array(n,o>>>0,h),U=a(s,l)[i];let k=0;for(;k<h;k++)new Float64Array(n,_[k],g).set(U[k])},writeFloat64Array2D(i,o,h,g){const _=new Uint32Array(n,o>>>0,h),U=a(s,l)[i]=d.create("float64",[h,g]);let k=0;for(;k<h;k++)U[k].set(new Float64Array(n,_[k],g))},emscripten_notify_memory_growth(i){n=r.buffer}}}),r=e.exports.memory;let n=r.buffer;L=e;const s=new D(e);return L=null,s};let Q=D;const K=P;self.addEventListener("message",async p=>{try{const{data:t}=p,e=Function(`'use strict';return (${t.functionToRun})`)(),r=await K(t.module);let[n,s]=await e({Ndarray:d,world:r},t.args);postMessage(n,s)}catch(t){try{postMessage({error:t??"Unknown Error"});return}catch{}try{let{name:e,message:r,stack:n}=t;r??="Unknown Error",postMessage({error:{name:e,message:r,stack:n}});return}catch{}postMessage({error:{message:"Unknown Error"}})}},{once:!0})})();