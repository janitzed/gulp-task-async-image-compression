# Run image compression

    nano gulpfile

    #  Change the variables: 
    #    - SOURCE
    #    - DESCTINATION 
    #  to your needs.

    npm install 
    npm update
    mkdir source
    mkdir public
    cd source
    # copy images you want to compress to the source folder
    cp -R /source/path/to/your/images/ . 
    cd ..
    npm run compress:images