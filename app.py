# -*- coding: utf-8 -*-
import sys,os
sys.path.insert(0,os.path.join(os.path.dirname(__file__),'site-packages'))

from flask import Flask,request,jsonify
app=Flask(__name__,static_folder='./dist',static_url_path='/')
max_content_length=128*1024*1024
app.config['MAX_CONTENT_LENGTH']=max_content_length

from flask_cors import CORS
CORS(app,supports_credentials=True)

from functools import wraps
from time import time
import numpy as np,pyworld as pw,msgpack as mp,soundfile as sf
from tempfile import SpooledTemporaryFile as TempFile
#from scipy.io import wavfile

def packNdarray(array:np.ndarray)->dict:
    return {
       'shape':array.shape,
       'dtype':str(array.dtype),
      'buffer':array.tobytes('C')
    }
def unpackNdarray(array:dict)->np.ndarray:
    return np.ndarray(**array,order='C')


@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/env',methods=['GET'])
def env():
    return jsonify(
      executable=sys.executable,
      byteorder=sys.byteorder,
      path=sys.path,
      modules=list(sys.modules.keys())
    )

@app.route('/soundfile/available/',methods=['GET'])
@app.route('/soundfile/available/<format>',methods=['GET'])
def soundfile_available(format=None):
    if format is None:
        data=sf.available_formats()
    else:
        data=sf.available_subtypes(format=format)
    return mp.packb(data),200,{
      'Content-Type':'application/x-msgpack'
    }

@app.route('/soundfile/read',methods=['POST'])
def soundfile_read():
    with TempFile(max_size=max_content_length) as file:
        file.write(request.get_data())
        file.seek(0)
        info=dict(**sf.info(file).__dict__)
        file.seek(0)
        data,fs=sf.read(file)

    info.pop('verbose')
    info.pop('name')
    if data.ndim==2:# and data.shape[1]==info['channels']
        data=data.swapaxes(0,1)
    return mp.packb({
      'fs':fs,
      'info':info,
      'data':packNdarray(data)
    }),200,{
      'Content-Type':'application/x-msgpack'
    }

@app.route('/soundfile/write',methods=['POST'])
def soundfile_write():
    requ_body=mp.unpackb(request.get_data())
    with TempFile(max_size=max_content_length) as file:
        sf.write(
          file=file,
          data=unpackNdarray(requ_body['data']),
          samplerate=requ_body['fs'],
          format=requ_body.get('format'),
          subtype=requ_body.get('subtype'),
          #closefd=True
        )
        file.seek(0)
        data=file.read()
    return data,200,{
      'Content-Type':'application/octet-stream'
    }

def wrap_msgpack(func):
    @wraps(func)
    def wrapper(*args,**kwargs):
        requ_body=mp.unpackb(request.get_data())
        start=time()
        resp_body=func(**requ_body)
        dur=int((time()-start)*1000)
        return mp.packb(resp_body),200,{
          'Content-Type':'application/x-msgpack',
          'Server-Timing':f'cpu;dur={dur}'
        }
    return wrapper

@app.route('/pyworld/dio',methods=['POST'])
@wrap_msgpack
def dio(data,fs):
    data=unpackNdarray(data).astype(float)
    _f0,t=pw.dio(data,fs)
    f0=pw.stonemask(data,_f0,t,fs)
    return {
       't':packNdarray(t),
      'f0':packNdarray(f0)
    }

@app.route('/pyworld/harvest',methods=['POST'])
@wrap_msgpack
def harvest(data,fs):
    data=unpackNdarray(data).astype(float)
    _f0,t=pw.harvest(data,fs)
    f0=pw.stonemask(data,_f0,t,fs)
    return {
       't':packNdarray(t),
      'f0':packNdarray(f0)
    }

@app.route('/pyworld/all',methods=['POST'])
@wrap_msgpack
def all(data,fs):
    data=unpackNdarray(data).astype(float)
    _f0,t=pw.dio(data,fs)
    f0=pw.stonemask(data,_f0,t,fs)
    sp=pw.cheaptrick(data,f0,t,fs)
    ap=pw.d4c(data,f0,t,fs)
    return {
       't':packNdarray(t),
      'f0':packNdarray(f0),
      'sp':packNdarray(sp),
      'ap':packNdarray(ap)
    }

@app.route('/pyworld/synthesize',methods=['POST'])
@wrap_msgpack
def synthesize(f0,sp,ap,fs):
    f0=unpackNdarray(f0)
    sp=unpackNdarray(sp).copy()
    ap=unpackNdarray(ap).copy()
    data=pw.synthesize(f0,sp,ap,fs)
    return packNdarray(data)

#https://github.com/JeremyCCHsu/Python-Wrapper-for-World-Vocoder/blob/master/demo/demo.py
@app.route('/pyworld/savefig',methods=['POST'])
def savefig():
    import matplotlib      # Remove this line if you don't need them
    matplotlib.use('Agg')  # Remove this line if you don't need them
    import matplotlib.pyplot as plt
    EPSILON = 1e-8
    #h = 10
    
    requ_body=mp.unpackb(request.get_data())
    log=requ_body.get('log',True)
    figlist=list(map(lambda x:unpackNdarray(x),requ_body['figlist']))
    n = len(figlist)
    # peek into instances
    f = figlist[0]
    if len(f.shape) == 1:
        plt.figure()
        for i, f in enumerate(figlist):
            plt.subplot(n, 1, i+1)
            if len(f.shape) == 1:
                plt.plot(f)
                plt.xlim([0, len(f)])
    elif len(f.shape) == 2:
        #Nsmp, dim = figlist[0].shape
        #figsize=(h * float(Nsmp) / dim, len(figlist) * h)
        #plt.figure(figsize=figsize)
        plt.figure()
        for i, f in enumerate(figlist):
            plt.subplot(n, 1, i+1)
            if log:
                x = np.log(f + EPSILON)
            else:
                x = f + EPSILON
            plt.imshow(
              x.T, origin='lower',
              interpolation='none',
              aspect='auto',
              extent=(0, x.shape[0], 0, x.shape[1])
            )
    else:
        raise ValueError('Input dimension must < 3.')
    
    with TempFile(max_size=max_content_length) as file:
        plt.savefig(file,format='png')
        plt.close()
        file.seek(0)
        data=file.read()
    return data,200,{
      'Content-Type':'image/png'
    }

if __name__=='__main__':
    port=6701
    url='http://127.0.0.1:'+str(port)
    def testWindows():
        from time import sleep
        import urllib
        while True:
            try:
                sleep(0.5)
                urllib.request.urlopen(url)
                break
            except urllib.error.URLError as e:
                pass
        os.system("explorer "+url)
    '''
    try:
        urllib.request.urlopen(url)
        print('端口被占用')
    except urllib.error.URLError as e:
    '''
    import platform
    system=platform.system()
    if system=="Windows":
        from threading import Thread
        thread=Thread(target=testWindows,args=[])
        thread.start()
    app.run(port=port)