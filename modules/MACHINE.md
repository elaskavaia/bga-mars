# Server-side operation machine

Operation machine is enhanced state machine with stack of operations (or queue, or random access)
All user states are driven by the dispatcher state.
Basic flow is the following:
* During game setup some operations are put on stack, for example a turnSetup operations, then game changes to dispatcher state
* Dispatcher checks if anything is in on stack and switches users and state accordinly (or operation can be executed by the game itself)
* User selects the action and its arguments (to resolve the operation), action has to manipulate the stack to remove/add more operations
* After user action we go back to dispatcher
* If no operations left on stack dispatcher may do some default operation, i.e check game end, or start another turn

To form the stack all operations have rank, if rank is the same for multiple operations - it means user would have to make the choice
between them

Terms
* Player, Owner, Effect, Operation, Operation Presentation, Mandatory, Optional, Mandatory if possible, Void, Resolve
BGA Terms:
* BGAAction, BGAState, BGAPlayer

Operation:
* OperationType - info pertaining to type of operation (static)
* PlayerSelector - who perform the operation, specific player color or multiplayer selector or n/a
* OperationArgs - dynamic info about the operation

Operation properties dynamic (db)
* id - auto-increment numberic id
* type - numberic or string that can reference the operation in material file, all types are unique
* rank - rank of operation, 1 - highest (then 2,3,4... can be gaps), 0 - current (resolving), -1 - inactive
* count - repeat count
* flags - automatic effect aplied to stack when action is operation for execution, also hold optionality of the action
* owner - owner of operation (i.e. color), reserved values for multiplayer?
* data - string or id of operation that caused this (to explain user complex effects)


Operation properties static (material)
* name - short action description (to be used on the button also)
* mnemonic - icon/image presentation of the action, to be used instead of name if defined, in cases where applicable, use notation such as ${icon.food}
* tooltip - long action descption
* state - numberic state - state we go (jump) to when we ready to resolve operation, only used for single state 
* description - state description if using generic state
* descriptionmyturn - state description if using generic state
* action - bga state action name
* undo - set to true/false if action can be undone
* params - list of named parameter that will be passed to action hanlder when user completes the action resolution in client
* prompt - same as decription

Resolve effects
* or - operation decrements count of all operations with same rank, if any of them reach 0 count - they are removed also
* and - operation decrements count only of current operation, if it reaches 0 it removes itself, becomes current with count 1  
* unique - operation removes itself from the stack indendent of count, becomes current and proceed to resolve 

Note: you can combine or,unique 

Special actions
* Decline - user opted out of optional single action or rest of count (presented when single action is on the stack)
* Skip - user opted out of the rest of optinal actions (presented if the all optional)
* Choice - user choose one of the options without providing any other arguments (presented when all operations are choice)
* Resolve - user choose one of the options and provided all the arguments to fully resolve it, can be ordered list as well
* Undo - unrelated to stack


Stack operations (internal)
* Drop(A:opId):void - ValidateOptional(A); Remove(A)
* Sub(A:opId,Y:number):void - decrements count of operation A by Y (with check), removes if 0
* Renice(A:opId,X:number):void - change rank of operation A to be X
* ReniceAll(Y:number,X:number):void - change rank of all operation with rank Y to X
* Pop(A:opId):op -  x=Operation(A); Remove(A); return x
* Normalize():void - make sure highest rank is 1
* Interrupt():void - change rank of all operations which rank >=1 to be +1
* Push(B:op):void - add operation B to list of operation as rank 1
* Queue(B:op):void - add operation B to list of operation as current lowest rank 
* Operation(A:opId):op - return operation with id A
* Operatons(X:number):op[] - return list of operation of rank X, if X is 0 or -1 it will return empty list
* TopRank():number - return highest rank (which is lowest rank number >0) (0 is none)
* BottomRank():number - return lowest rank (0 is none)
* Top():op[] - Operations(TopRank())



Database mapping
* All operations of the same rank represent a "group"
* A group can only have one resolve operator (i.e all items should have the same) (or, and or seq)
* If group is "or" group count affects all elements (i.e. it is shared), otherwise it is private




a/b/c:2:us  => a => a;b/c:1:us   ===   (a+b+c){2}
            => 0 => x
a/b/c:2:u   => a => 2a;b/c:2:u    ===  (2a+2b+2c){3}
a/b/c:1:u   => a => a;b/c:1:u     ===  (a+b+c){3}
a/b/c:2:s   => a => a;a/b/c:1:s   ===  (a/b/c)[2]
a/b/c:2:    => a => 2a;a/b/c:2    ===  (2a/2b/2c)+

a/b/c:2:ous  => a => 2a;b/c:2:uo   ===  (a+b+c){0..2}
a/b/c:2:ou  => a => 2a;b/c:2:uo    ===  (2a+2b+2c){0..1}
a/b/c:2:os  => a => 2a;b/c:2o     ===   (a/b/c)[0..2]
a/b/c:2:o   => a => 2a;b/c:2o     ===   (2a+2b+2c){0..1}
            => 0 => @
a/b:2:ous   => a => a;b:1:us      ===  (a+b)[0..2]
            => 0 => @

a+b+c:2:us => a => a;b+c:1:us      ===  (a+b+c){2}   2~(a+b+c)
a+b+c:2:u  => a => 2a;b+c:2:u      ===  (2a+2b+2c)   2*(a+b+c)
a+b+c:1:u  => a => a;b+c:1:u       ===  (a+b+c)    
a+b+c:2:s  => a => a;a/b/c:1:s     ===  (a/b/c)[2]   2*(a/b/c)
a+b+c:2:   => a => 2a;a/b/c:2      ===  (2a/2b/2c)+  [1,*]*(a/b/c)


s - classic /
u - classic +
us - limited +
. - unbounded /