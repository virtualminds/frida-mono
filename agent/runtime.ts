"use strict";

/* jshint esnext: true, evil: true */

let cachedMonoApi:any = {};

export class MonoRuntime {


    api: any;
    available: any;
    mainImage: any;
    domain: any;


    constructor() {
        this.api = this.getApi();
        this.available = this.api !== null;
        this.mainImage = null;
         if(this.api) {
            this._getMainThread();
           this.mainImage = this.api.mono_assembly_get_image(this.api.mono_assembly_get_main());
           //console.log(this.getAssemblies());
        }
         
    }

    _getMainThread() {
        this.api.mono_thread_attach(this.api.mono_get_root_domain());
        this.domain = this.api.mono_domain_get();
        this.api.mono_thread_attach(this.domain);
        
        //
    }

    getAssemblies(){

        const assemblies = []
        const img = this.api.mono_assembly_get_image(this.api.mono_assembly_get_main());
        const tableInfo = this.api.mono_image_get_table_info(img,2); // MONO_TABLE_TYPEDEF == 2
        const rows = this.api.mono_table_info_get_rows(tableInfo);
        const cols = Memory.alloc(4 * 6) // MONO_TYPEDEF_SIZE == 6 / uint32

        for (var i = 0; i < rows; i++) {
            this.api.mono_metadata_decode_row(tableInfo, i, cols, 6);
            //console.log(hexdump(cols, {length: 24}));
            //var name = api.mono_metadata_string_heap(api.mono_get_corlib(),Memory.readU32(cols.add(4)));
            //var nameSpace = api.mono_metadata_string_heap(api.mono_get_corlib(),Memory.readU32(cols.add(8)));
            var name = this.api.mono_metadata_string_heap(img,Memory.readU32(cols.add(4)));
            var nameSpace = this.api.mono_metadata_string_heap(img,Memory.readU32(cols.add(8)));
            var assemblyName = (Memory.readCString(nameSpace) ? Memory.readCString(nameSpace) + "." + Memory.readCString(name) : Memory.readCString(name))
            assemblies.push(assemblyName);
        }
        
        return assemblies;
    }

    enumerateAssemblies (callbacks:any) {

        var assemblies = this.getAssemblies();

        assemblies.forEach(assembly => {
                callbacks.onMatch(assembly);
        });
    
    }

    newInstance(nameSpace:any, klassStr:any) {
        
        let obj = null;
        
        //this._getMainThread();

        console.log("KAKA");
          
        
        nameSpace = Memory.allocUtf8String(nameSpace);

        klassStr = Memory.allocUtf8String(klassStr);

        let  klass = this.api.mono_class_from_name(this.mainImage, nameSpace, klassStr);
        if(!klass.isNull()) {
            //console.log("Clase encontrada");
            obj = this.api.mono_object_new(this.api.mono_domain_get(), klass);
            if(!obj.isNull()) {
                this.api.mono_runtime_object_init(obj);
            }
        }

        return obj;
    }

    invokeMethod(obj:any, method:any, args:any){
        
        let desc = this.api.mono_method_desc_new(Memory.allocUtf8String(method), 0);
        console.log("Metodo: " + method + " Desc: " + desc);
        if(!desc.isNull()) {
            
            let klass = this.api.mono_object_get_class(obj);
            let method = this.api.mono_method_desc_search_in_class(desc, klass);
            if(!method.isNull()) {
                console.log("Metodo encontrado " + method);
                this.api.mono_runtime_invoke(method, obj, args, NULL); 
                let ji = this.api.mono_get_jit_info_from_method(this.api.mono_domain_get(), method);
                let addr = this.api.mono_jit_info_get_code_start(ji);
                console.log("Address: " + addr);
                
            }
            console.log("Limpieza");
            this.api.mono_method_desc_free(desc);
             
        }
    }

    methodAddr(nameSpace:any, klassName:any, method:any){
        
        let desc = this.api.mono_method_desc_new(Memory.allocUtf8String(method), 0);
        let addr:any = NULL;
        if(!desc.isNull()) {
            
            let klass = this.api.mono_class_from_name(this.mainImage, Memory.allocUtf8String(nameSpace), Memory.allocUtf8String(klassName));
            console.log("Klass: " + klass);
            let method = this.api.mono_method_desc_search_in_class(desc, klass);
            if(!method.isNull()) {
                console.log("Metodo encontrado " + method);
                let ji = this.api.mono_get_jit_info_from_method(this.api.mono_domain_get(), method);
                addr = this.api.mono_jit_info_get_code_start(ji);
                console.log("Address: " + addr);
                
            }
            
            this.api.mono_method_desc_free(desc);
             
        }
        return addr;
    }

    printMethods(obj:any) {
        
        if(!obj.isNull()){
            
            let iter = Memory.alloc(4);
           

            Memory.writePointer(iter, NULL);
            
            let klass = this.api.mono_object_get_class(obj);
            console.log("Number of Methods: " + this.api.mono_class_num_methods(klass));
            let m = this.api.mono_class_get_methods(klass, iter);
            
            console.log("[**] Class: " + Memory.readCString(this.api.mono_class_get_name(klass)));
            while(!m.isNull()) {
                console.log("[Method] ====>  " + Memory.readCString(this.api.mono_method_get_name(m)));
                m = this.api.mono_class_get_methods(klass, iter);

            }
        }
    }

    printProperties(obj:any) {
        if(!obj.isNull()){
            
            let iter = Memory.alloc(4);
           

            Memory.writePointer(iter, NULL);
            
            let klass = this.api.mono_object_get_class(obj);
            console.log("Number of properties: " + this.api.mono_class_num_properties(klass));
            let p = this.api.mono_class_get_properties(klass, iter);
            
            console.log("[**] Class: " + Memory.readCString(this.api.mono_class_get_name(klass)));

            while(!p.isNull()) {
                console.log("[Property] ====>  " + Memory.readCString(this.api.mono_property_get_name(p)));
                p = this.api.mono_class_get_properties(klass, iter);

            }
        }
    }

    getFields(obj:any) {
        const fields = [];

        if(!obj.isNull()){
            
            let iter = Memory.alloc(4);
            Memory.writePointer(iter, NULL);
            
            let klass = this.api.mono_object_get_class(obj);
            //console.log("Number of fields: " + this.api.mono_class_num_fields(klass));
            let f = this.api.mono_class_get_fields(klass, iter);
            
            //console.log("[**] Class: " + Memory.readCString(this.api.mono_class_get_name(klass)));
            while(!f.isNull()) {
                fields.push(f);
                f = this.api.mono_class_get_fields(klass, iter);

            }
        }
        return fields;
    }
    enumerateFields(obj:any, callbacks:any) {
        const fields = this.getFields(obj);

        fields.forEach(field  => {
                var name = Memory.readCString(this.api.mono_field_get_name(field));
                callbacks.onMatch(field, name);
        });
    

    }

    _api = null;
    
    getApi() {
        if (this._api !== null) {
            return this._api;
        }
        
        const temporaryApi:any = {};
        const pending = [
        {
        module: "mono-sgen",
        functions: {
            "mono_class_get_name": ['pointer', ['pointer']],
            "mono_class_get_namespace": ['pointer', ['pointer']],
            "mono_get_corlib": ['pointer', []],
            "mono_domain_get": ['pointer', []],
            "mono_class_from_name": ['pointer', ['pointer','pointer','pointer']],
            "mono_class_from_name_case": ['pointer', ['pointer','pointer','pointer','pointer']],
            "mono_object_new": ['pointer', ['pointer','pointer']],
            "mono_runtime_invoke": ['pointer', ['pointer','pointer','pointer','pointer']],
            "mono_image_get_table_info": ['pointer', ['pointer', 'int']],
            "mono_table_info_get_rows": ['int', ['pointer']],
            "mono_metadata_decode_row": ['void', ['pointer', 'int', 'pointer', 'int']],
            "mono_metadata_string_heap": ['pointer', ['pointer', 'int']],
            "mono_assembly_get_main": ['pointer', []],
            "mono_assembly_get_image": ['pointer', ['pointer']],
            "mono_assembly_get_name": ['pointer', ['pointer']],
            "mono_assembly_name_get_name": ['pointer', ['pointer']],
            "mono_stringify_assembly_name": ['pointer',['pointer']],
            "mono_image_open": ['pointer', ['pointer', 'pointer']],
            "mono_get_root_domain": ['pointer', []],
            "mono_string_new": ['pointer', ['pointer', 'pointer']],
            "mono_thread_attach": ['pointer', ['pointer']],
            "mono_class_get_method_from_name": ['pointer', ['pointer', 'pointer', 'int']],
            "mono_method_desc_new": ['pointer', ['pointer', 'int']],
            "mono_method_desc_free": ['void', ['pointer']],
            "mono_object_get_class": ['pointer', ['pointer']],
            "mono_method_desc_search_in_class": ['pointer', ['pointer', 'pointer']],
            "mono_runtime_object_init": ['void',['pointer']],
            "mono_class_get_methods": ['pointer', ['pointer', 'pointer']],
            "mono_method_get_name": ['pointer', ['pointer']],
            "mono_class_get_properties": ['pointer', ['pointer', 'pointer']],
            "mono_property_get_name": ['pointer', ['pointer']],
            "mono_class_get_fields": ['pointer', ['pointer', 'pointer']],
            "mono_field_get_name": ['pointer', ['pointer']],
            "mono_class_num_fields": ['int', ['pointer']],
            "mono_class_num_properties": ['int', ['pointer']],
            "mono_class_num_methods": ['int', ['pointer']],
            "mono_field_get_value": ['void', ['pointer', 'pointer', 'pointer']],
           // "mono_method_get_vtable_slot": ['int', ['pointer']],
            "mono_get_jit_info_from_method" : ['pointer',['pointer','pointer']],
            "mono_jit_info_get_code_start": ['pointer',['pointer']],
            "mono_string_to_utf8": ['pointer', ['pointer']]

        }
    }];

    var remaining = 0;
    pending.forEach(function (api) {
        let isMonoApi = api.module === 'mono-sgen';
        let functions:any = api.functions || {};


        remaining += Object.keys(functions).length

        const exportByName = Module
        .enumerateExportsSync(api.module)
        .reduce(function (result:any, exp) {
            result[exp.name] = exp;
            return result;
        }, {});

        Object.keys(functions)
        .forEach(function (name) {
            const exp = exportByName[name];
            if (exp !== undefined && exp.type === 'function') {
                const signature = functions[name];
                if (typeof signature === 'function') {
                    signature.call(temporaryApi, exp.address);
                    if (isMonoApi)
                        signature.call(cachedMonoApi, exp.address);
                } else {
                    temporaryApi[name] = new NativeFunction(exp.address, signature[0], signature[1]);
                    if (isMonoApi)
                        cachedMonoApi[name] = temporaryApi[name];
                }
                remaining--;
            } 
        });
    });
    if (remaining === 0) {
        this._api = temporaryApi;
    }

    return this._api;
    }
}


