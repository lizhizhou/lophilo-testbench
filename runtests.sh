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

FN=results/$LMC_MAC.config
echo "export LMC_IP=$LMC_IP" > $FN
echo "export LMC_PORT=$LMC_PORT" >> $FN
echo "export LMC_MAC=$LMC_MAC" >> $FN
cat $FN
FN=results/$LMC_MAC.date
date > $FN
cat $FN

mocha -t 60000 test/*.js
