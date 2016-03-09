Managing The Docker Panel
=========================

__Docker__ is a panel on the right side of the screen, letting you keep command results always visible to you.
Think of Performance monitor charts, long processing test execution commands, placing these manuals always-on and more.

To make the board visible, execute the `docker` command. Whenever executed, this command will toggle the visibility state of the board.

There are two ways to dock command results on _Docker_:

* After the command execution, type `docker --dock`. This will take the last result and move it to the _Docker_ panel.
* While pressing the `ctrl` key, double click the result item. This will make the item _draggable_. You are now able to drag the item and drop on _Docker_ panel.


Actions
-------
* To cancel an item from being _draggable_, just `ctrl`+double click on that item again.
* To delete an item from _Docker_ panel, `ctrl`+double click that item.


You can leave _Docker_ opened on screen, minimized or maximize by clicking the `Docker` title.  
To close _Docker_ panel, click the X button which will apear when hovering the panel.

Example
-------
Try the following

```
docker
man docker
docker --dock
```

Notice that this manual is now always on in the _Docker_ panel.

Another Example
---------------
Type `set -o`. `ctrl`+double click the result and release the buttons. Now, drag the result panel to _Docker_ panel, and relase the mouse.  
Notice the settings panel is docking on _Docker_ panel.  

Now try to change a setting variable, for example, change the application context by typing `set app console.sys`. 
Notice that the settings panel is updated and always displays the updated settings state.

Have fun!

