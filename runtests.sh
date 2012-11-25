if [ -z "$LMC_IP" ]; then
	echo "LMC_IP need to be set"
	exit 1
fi
if [ -z "$LMC_MAC" ]; then
	echo "LMC_MAC need to be set"
	exit 1
fi
if [ -z "$LMC_PORT" ]; then
	echo "LMC_PORT need to be set"
	exit 1
fi

if [ -z "$1" ]; then
    echo "XEM id number must be specified as the first parameter"
    exit 1
fi

if [ -z "$2" ]; then
    export LMC_TESTID="$LMC_MAC"
else
    export LMC_TESTID="$2-$LMC_MAC"
fi
echo "export LMC_TESTID=$LMC_TESTID"

FN=results/$LMC_TESTID.sn
echo $1 > $FN

FN=results/$LMC_TESTID.config
echo "export LMC_IP=$LMC_IP" > $FN
echo "export LMC_PORT=$LMC_PORT" >> $FN
echo "export LMC_MAC=$LMC_MAC" >> $FN
cat $FN

FN=results/$LMC_TESTID.date
date > $FN
cat $FN

mocha -t 60000 test/*.js
