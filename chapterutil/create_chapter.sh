file="levels/$1.csv"

if [ -e $file ]; then
    echo "This chapter already exists."
fi

echo "board,goal,textgoal,toolbox,defines,globals,syntax,animationScales,comments" > $file & echo "Chapter created"