import { MonoRuntime } from "./runtime";



var mono = new MonoRuntime();

if(!mono.available) {

    console.log("Mono ERROR");
    console.log(mono.api);
    
} else{
    console.log("Assemblies");
    mono.enumerateAssemblies({

        onMatch: function(assembly:any) {
            console.log("Assembly name: " + assembly);
        }

        
    })

    //let obj = mono.newInstance("UltimateMinesweeper", "MineField");
   // let obj = mono.newInstance("\x00","MainWindow");
    //if(obj) {
        //console.log("Clase encontrada " + obj);
     //mono.invokeMethod(obj,Memory.allocUtf8String("System.Windows.Forms:Show"),NULL);
        //mono.invokeMethod(obj,"MainWindow:SendMsg(string)",NULL);
        let addr = mono.methodAddr("\x00", "MainWindow", "MainWindow:SendMsg(string)");
        if(addr) {
            Interceptor.attach(addr, {
                onEnter: function (args) {
                    //console.log("0 => " + args[0] + " 1 => " + args[1] + " 2 => " + args[2]);
                    //console.log(JSON.stringify(this.context));  
                    console.log("Arg: " + Memory.readCString(mono.api.mono_string_to_utf8(args[1])));
                
            },
                onLeave: function (result) {
                    console.log(result)
                }
            });
        }
        //mono.printMethods(obj);

      //mono.printProperties(obj);
    /*     mono.enumerateFields(obj,{
            onMatch: function(field:any, name:any) {
                if(name == 'nombre') {
                    var RC = Memory.alloc(1024);
                    
                    mono.api.mono_field_get_value(obj, field, RC);
                    console.log("size: " + Memory.readInt(RC));
                    
                } else {
                    console.log("Field name: " + name);
                }
            } 

        })*/


   // }
}